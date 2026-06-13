import type { Batch, ClothingItem, FeeChange, Customer, Member, PricePackage } from '../types'
import { WASH_ITEMS, MEMBER_DISCOUNTS, OVERDUE_RULES, FeeChangeType } from '../types'
import { getOverdueDays } from './dateUtil'

export interface FeeBreakdown {
  baseFee: number
  discountAmount: number
  packageDeduction: number
  overdueFee: number
  adjustments: FeeChange[]
  totalPayable: number
  clothBreakdown: Record<string, {
    basePrice: number
    discount: number
    overdueShare: number
    final: number
  }>
}

export function calcOverdueFee(
  expectedTime: Date | string | number,
  now: Date = new Date(),
  rules = OVERDUE_RULES
): number {
  const overdueDays = getOverdueDays(expectedTime, now)
  if (overdueDays <= 0) return 0

  let fee = 0
  if (overdueDays <= rules.stage1Days) {
    fee = overdueDays * rules.stage1Rate
  } else {
    fee = rules.stage1Days * rules.stage1Rate + (overdueDays - rules.stage1Days) * rules.stage2Rate
  }
  return Math.round(fee * 100) / 100
}

export function getMemberDiscountRate(member?: Member | null): number {
  if (!member) return 1
  return MEMBER_DISCOUNTS[member.level] || 1
}

export function calcClothingBaseFee(
  clothing: ClothingItem,
  memberDiscount: number = 1
): { basePrice: number; discount: number; final: number } {
  const basePrice = clothing.basePrice
  const discount = Math.round(basePrice * (1 - memberDiscount) * 100) / 100
  const final = Math.round((basePrice - discount) * 100) / 100
  return { basePrice, discount, final }
}

export function calcBatchBaseFee(
  clothingItems: ClothingItem[],
  member?: Member | null,
  pricePackage?: PricePackage | null
): {
  baseFee: number
  discountAmount: number
  packageDeduction: number
  clothBase: Record<string, { basePrice: number; discount: number; final: number }>
} {
  const memberDiscount = getMemberDiscountRate(member)
  let baseFee = 0
  let discountAmount = 0
  const clothBase: Record<string, { basePrice: number; discount: number; final: number }> = {}

  clothingItems.forEach((c) => {
    const r = calcClothingBaseFee(c, memberDiscount)
    baseFee += r.basePrice
    discountAmount += r.discount
    clothBase[c.id] = r
  })

  baseFee = Math.round(baseFee * 100) / 100
  discountAmount = Math.round(discountAmount * 100) / 100

  let packageDeduction = 0
  if (pricePackage && pricePackage.type === '金额' && pricePackage.value > 0) {
    const netAfterDiscount = baseFee - discountAmount
    packageDeduction = Math.min(netAfterDiscount, pricePackage.value)
  }

  return {
    baseFee,
    discountAmount,
    packageDeduction: Math.round(packageDeduction * 100) / 100,
    clothBase,
  }
}

export function distributeOverdueFee(
  overdueFee: number,
  clothingItems: ClothingItem[],
  clothBase: Record<string, { basePrice: number; discount: number; final: number }>
): Record<string, number> {
  const result: Record<string, number> = {}
  const availableClothes = clothingItems.filter((c) => !c.isPickedUp)
  const totalFinal = availableClothes.reduce((sum, c) => sum + (clothBase[c.id]?.final || 0), 0)

  if (totalFinal <= 0 || overdueFee <= 0) {
    availableClothes.forEach((c) => {
      result[c.id] = 0
    })
    return result
  }

  let allocated = 0
  availableClothes.forEach((c, idx) => {
    const share =
      idx === availableClothes.length - 1
        ? overdueFee - allocated
        : Math.round(((clothBase[c.id]?.final || 0) / totalFinal) * overdueFee * 100) / 100
    result[c.id] = share
    allocated = Math.round((allocated + share) * 100) / 100
  })

  return result
}

export function calcBatchFee(
  batch: Batch,
  clothingItems: ClothingItem[],
  feeChanges: FeeChange[],
  member?: Member | null,
  pricePackage?: PricePackage | null,
  now: Date = new Date()
): FeeBreakdown {
  const unpickedClothes = clothingItems.filter((c) => !c.isPickedUp)
  const { baseFee, discountAmount, packageDeduction, clothBase } = calcBatchBaseFee(
    unpickedClothes,
    member,
    pricePackage
  )

  const overdueFee = calcOverdueFee(batch.expectedTime, now)
  const overdueShare = distributeOverdueFee(overdueFee, unpickedClothes, clothBase)

  const clothBreakdown: FeeBreakdown['clothBreakdown'] = {}
  unpickedClothes.forEach((c) => {
    const base = clothBase[c.id]
    clothBreakdown[c.id] = {
      basePrice: base.basePrice,
      discount: base.discount,
      overdueShare: overdueShare[c.id] || 0,
      final: Math.round((base.final + (overdueShare[c.id] || 0)) * 100) / 100,
    }
  })

  const batchFeeChanges = feeChanges.filter((f) => f.batchId === batch.id)
  const adjustmentTotal = batchFeeChanges.reduce((sum, a) => sum + a.amount, 0)

  const subTotal = Math.round((baseFee - discountAmount - packageDeduction + overdueFee) * 100) / 100
  const totalPayable = Math.max(0, Math.round((subTotal + adjustmentTotal) * 100) / 100)

  return {
    baseFee,
    discountAmount,
    packageDeduction,
    overdueFee,
    adjustments: batchFeeChanges,
    totalPayable,
    clothBreakdown,
  }
}

export function calcPartialPickupFee(
  batch: Batch,
  clothingItems: ClothingItem[],
  pickupClothingIds: string[],
  feeChanges: FeeChange[],
  member?: Member | null,
  pricePackage?: PricePackage | null,
  now: Date = new Date()
): FeeBreakdown {
  const fullBreakdown = calcBatchFee(batch, clothingItems, feeChanges, member, pricePackage, now)
  const pickupClothes = clothingItems.filter(
    (c) => pickupClothingIds.includes(c.id) && !c.isPickedUp
  )

  const pickupBaseFee = pickupClothes.reduce(
    (sum, c) => sum + (fullBreakdown.clothBreakdown[c.id]?.basePrice || 0),
    0
  )
  const pickupDiscount = pickupClothes.reduce(
    (sum, c) => sum + (fullBreakdown.clothBreakdown[c.id]?.discount || 0),
    0
  )
  const pickupOverdue = pickupClothes.reduce(
    (sum, c) => sum + (fullBreakdown.clothBreakdown[c.id]?.overdueShare || 0),
    0
  )

  const totalBaseFee = clothingItems.reduce(
    (sum, c) => sum + (fullBreakdown.clothBreakdown[c.id]?.basePrice || 0),
    0
  )
  const packageRatio = totalBaseFee > 0 ? pickupBaseFee / totalBaseFee : 0
  const pickupPackageDeduction = Math.round(fullBreakdown.packageDeduction * packageRatio * 100) / 100

  const relatedAdjustments = fullBreakdown.adjustments.filter(
    (a) =>
      a.changeType === FeeChangeType.DISCOUNT ||
      a.changeType === FeeChangeType.REDUCTION
  )
  const pickupAdjustmentTotal = relatedAdjustments.reduce((sum, a) => sum + a.amount, 0)

  const clothBreakdown: FeeBreakdown['clothBreakdown'] = {}
  pickupClothes.forEach((c) => {
    clothBreakdown[c.id] = fullBreakdown.clothBreakdown[c.id]
  })

  const subTotal = Math.round((pickupBaseFee - pickupDiscount - pickupPackageDeduction + pickupOverdue) * 100) / 100
  const totalPayable = Math.max(0, Math.round((subTotal + pickupAdjustmentTotal) * 100) / 100)

  return {
    baseFee: Math.round(pickupBaseFee * 100) / 100,
    discountAmount: Math.round(pickupDiscount * 100) / 100,
    packageDeduction: pickupPackageDeduction,
    overdueFee: Math.round(pickupOverdue * 100) / 100,
    adjustments: relatedAdjustments,
    totalPayable,
    clothBreakdown,
  }
}

export function previewFee(params: {
  washItems: { type: string; price: number }[]
  memberLevel?: string
  packageBalance?: number
  expectedTime?: Date | string | number
  now?: Date
}): FeeBreakdown {
  const { washItems, memberLevel, packageBalance = 0, expectedTime, now = new Date() } = params

  let baseFee = 0
  let discountAmount = 0
  const memberDiscount = memberLevel ? MEMBER_DISCOUNTS[memberLevel] || 1 : 1

  const clothBase: Record<string, { basePrice: number; discount: number; final: number }> = {}

  washItems.forEach((item, idx) => {
    const basePrice = item.price
    const discount = Math.round(basePrice * (1 - memberDiscount) * 100) / 100
    const final = Math.round((basePrice - discount) * 100) / 100
    baseFee += basePrice
    discountAmount += discount
    clothBase[`preview_${idx}`] = { basePrice, discount, final }
  })

  baseFee = Math.round(baseFee * 100) / 100
  discountAmount = Math.round(discountAmount * 100) / 100

  const netAfterDiscount = baseFee - discountAmount
  const actualPackageDeduction = Math.min(netAfterDiscount, packageBalance)

  const overdueFee = expectedTime ? calcOverdueFee(expectedTime, now) : 0

  const overdueShare: Record<string, number> = {}
  const totalFinal = washItems.reduce(
    (sum, _item, idx) => sum + clothBase[`preview_${idx}`].final,
    0
  )
  if (overdueFee > 0 && totalFinal > 0) {
    let allocated = 0
    washItems.forEach((_item, idx) => {
      const key = `preview_${idx}`
      const share =
        idx === washItems.length - 1
          ? overdueFee - allocated
          : Math.round((clothBase[key].final / totalFinal) * overdueFee * 100) / 100
      overdueShare[key] = share
      allocated = Math.round((allocated + share) * 100) / 100
    })
  }

  const clothBreakdown: FeeBreakdown['clothBreakdown'] = {}
  washItems.forEach((_item, idx) => {
    const key = `preview_${idx}`
    clothBreakdown[key] = {
      basePrice: clothBase[key].basePrice,
      discount: clothBase[key].discount,
      overdueShare: overdueShare[key] || 0,
      final: Math.round((clothBase[key].final + (overdueShare[key] || 0)) * 100) / 100,
    }
  })

  const subTotal = Math.round((baseFee - discountAmount - actualPackageDeduction + overdueFee) * 100) / 100

  return {
    baseFee,
    discountAmount,
    packageDeduction: Math.round(actualPackageDeduction * 100) / 100,
    overdueFee,
    adjustments: [],
    totalPayable: Math.max(0, subTotal),
    clothBreakdown,
  }
}

export function getWashProjectName(projectKey: string): string {
  return WASH_ITEMS[projectKey]?.name || projectKey
}

export function getWashProjectPrice(projectKey: string): number {
  return WASH_ITEMS[projectKey]?.price || 0
}
