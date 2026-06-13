import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { storage } from '../utils/storage'
import type {
  Batch,
  ClothingItem,
  Customer,
  Store,
  PricePackage,
  Member,
  QcRecord,
  LockRecord,
  FeeChange,
  RewashRecord,
  Compensation,
  PickupLog,
  Transfer,
} from '../types'
import {
  BatchStatus,
  ClothingStatus,
  ClothingQcStatus,
  QcResult,
  LockType,
  FeeChangeType,
  RewashStatus,
  CompensationStatus,
  TransferStatus,
  MAX_PICKUP_ATTEMPTS,
} from '../types'
import { generatePickupCode, generateBatchSerial, generateClothBarcode } from '../utils/codeGen'
import { calcBatchStatus, canRevertBatch, canNotifyBatchPickup, canCompleteBatch } from '../utils/statusCalc'
import { calcBatchFee, calcPartialPickupFee, type FeeBreakdown } from '../utils/feeCalc'

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

interface CreateBatchInput {
  customerId: string
  customerName: string
  customerPhone: string
  storeId: string
  createdBy: string
  expectedTime?: Date
}

interface CreateClothingInput {
  clothingType: string
  color: string
  colorRisk: string
  valuation: number
  isValuable: boolean
  washProject: string
  basePrice: number
  isOutsourced?: boolean
  outsourcedVendor?: string | null
}

interface BatchState {
  batches: Batch[]
  clothingItems: ClothingItem[]
  customers: Customer[]
  stores: Store[]
  pricePackages: PricePackage[]
  members: Member[]
  qcRecords: QcRecord[]
  rewashRecords: RewashRecord[]
  compensations: Compensation[]
  lockRecords: LockRecord[]
  feeChanges: FeeChange[]
  pickupLogs: PickupLog[]
  transfers: Transfer[]
  isInitialized: boolean
}

interface BatchActions {
  initDemoData: () => void
  clearAllData: () => void
  createBatch: (batchData: CreateBatchInput, clothingItems: CreateClothingInput[]) => Batch
  splitBatch: (batchId: string, selectedClothingIds: string[]) => Batch
  addClothingToBatch: (batchId: string, clothing: CreateClothingInput) => ClothingItem
  updateClothingStatus: (clothingId: string, status: ClothingStatus, qcStatus?: ClothingQcStatus) => void
  markPickedUp: (batchId: string, clothingIds: string[], operator: string) => { pickedItems: ClothingItem[]; totalFee: number }
  getBatchById: (id: string) => (Batch & { clothingItems: ClothingItem[]; totalFee: number }) | undefined
  getClothingByBatchId: (batchId: string) => ClothingItem[]
  searchBatches: (keyword: string, status?: BatchStatus) => Batch[]
  getQcBatches: () => Batch[]
  markDayClosed: (batchIds: string[], operator: string) => void
  recalculateBatchStatus: (batchId: string) => void
  recalculateAllBatchStatuses: () => void
  submitQc: (input: {
    batchId: string
    clothingId: string
    result: QcResult
    description?: string
    photos?: string[]
    suggestion?: string
    inspector: string
  }) => QcRecord
  createRewash: (batchId: string, clothingId: string, reason: string, operator: string) => RewashRecord
  submitCompensation: (data: {
    batchId: string
    clothingId: string
    applyAmount: number
    reason: string
    applicant: string
  }) => Compensation
  approveCompensation: (id: string, approvedAmount: number, approver: string) => void
  rejectCompensation: (id: string, approver: string) => void
  verifyPickupCode: (batchId: string, code: string) => { success: boolean; remainingAttempts: number; isLocked: boolean }
  verifyByPhone: (phone: string) => Batch[]
  lockBatch: (batchId: string, lockType: LockType, reason: string, operator?: string) => void
  unlockBatch: (batchId: string, operator: string, reason: string) => void
  recordPickupAttempt: (batchId: string, input: string, isSuccess: boolean, failReason?: string) => void
  createTransfer: (fromStoreId: string, toStoreId: string, clothingIds: string[], operator: string) => Transfer
  getFailedAttempts: (batchId: string) => number
  isBatchLocked: (batchId: string) => boolean
  applyFeeChange: (
    batchId: string,
    changeType: FeeChangeType,
    amount: number,
    reason: string,
    operator: string
  ) => FeeChange
  reverseFeeChange: (changeId: string, operator: string) => void
  calculateBatchFee: (batchId: string, partialClothingIds?: string[]) => FeeBreakdown
  getMemberById: (memberId: string | null) => Member | null
  getPricePackageById: (packageId: string | null) => PricePackage | null
  getCustomerByPhone: (phone: string) => Customer | undefined
  getBatchStatusInfo: (batchId: string) => ReturnType<typeof calcBatchStatus> | null
  canRevertBatch: (batchId: string) => boolean
}

export type AppStore = BatchState & BatchActions

const zustandStorage = {
  getItem: (name: string) => {
    const value = storage.get(name)
    return value !== null ? JSON.stringify(value) : null
  },
  setItem: (name: string, value: string) => {
    storage.set(name, JSON.parse(value))
  },
  removeItem: (name: string) => {
    storage.remove(name)
  },
}

function getClientIp(): string {
  return '127.0.0.1'
}

function updateBatchStatusFromClothing(
  batchId: string,
  state: BatchState
): Batch | undefined {
  const batch = state.batches.find((b) => b.id === batchId)
  if (!batch) return undefined

  const batchClothing = state.clothingItems.filter((c) => c.batchId === batchId)
  const lockRecords = state.lockRecords.filter((l) => l.batchId === batchId)
  const feeChanges = state.feeChanges.filter((f) => f.batchId === batchId)
  const qcRecords = state.qcRecords.filter((q) => q.batchId === batchId)

  const statusResult = calcBatchStatus(batch, batchClothing, lockRecords, feeChanges, qcRecords)

  return {
    ...batch,
    status: statusResult.status,
    isLocked: statusResult.isLocked,
  }
}

function createDemoData(): BatchState {
  const stores: Store[] = [
    { id: 'store_001', name: '总店', address: '北京市朝阳区建国路88号' },
    { id: 'store_002', name: '朝阳分店', address: '北京市朝阳区望京街道' },
  ]

  const members: Member[] = [
    {
      id: 'member_001',
      level: 'gold' as any,
      discountRate: 0.85,
      points: 1500,
      packageId: null,
    },
    {
      id: 'member_002',
      level: 'silver' as any,
      discountRate: 0.92,
      points: 800,
      packageId: null,
    },
    {
      id: 'member_003',
      level: 'diamond' as any,
      discountRate: 0.75,
      points: 5000,
      packageId: 'pkg_001',
    },
  ]

  const customers: Customer[] = [
    {
      id: 'cust_001',
      name: '张三',
      phone: '13800138000',
      memberId: 'member_001',
      isAuthorized: true,
      authorizedPhone: null,
      authorizeExpire: null,
    },
    {
      id: 'cust_002',
      name: '李四',
      phone: '13900139000',
      memberId: 'member_002',
      isAuthorized: false,
      authorizedPhone: null,
      authorizeExpire: null,
    },
    {
      id: 'cust_003',
      name: '王五',
      phone: '13700137000',
      memberId: null,
      isAuthorized: false,
      authorizedPhone: null,
      authorizeExpire: null,
    },
    {
      id: 'cust_004',
      name: '赵六',
      phone: '13600136000',
      memberId: 'member_003',
      isAuthorized: true,
      authorizedPhone: '13500135000',
      authorizeExpire: null,
    },
  ]

  const pricePackages: PricePackage[] = [
    {
      id: 'pkg_001',
      name: '干洗10次卡',
      type: '次数' as any,
      value: 10,
      price: 300,
      washProjects: ['dry_clean'],
    },
    {
      id: 'pkg_002',
      name: '水洗20次卡',
      type: '次数' as any,
      value: 20,
      price: 300,
      washProjects: ['water_wash'],
    },
    {
      id: 'pkg_003',
      name: '500元储值卡',
      type: '金额' as any,
      value: 500,
      price: 500,
      washProjects: [],
    },
  ]

  const now = new Date()
  const batches: Batch[] = []
  const clothingItems: ClothingItem[] = []
  const qcRecords: QcRecord[] = []
  const rewashRecords: RewashRecord[] = []
  const compensations: Compensation[] = []
  const lockRecords: LockRecord[] = []
  const feeChanges: FeeChange[] = []
  const pickupLogs: PickupLog[] = []
  const transfers: Transfer[] = []

  const batch1No = generateBatchSerial('store_001', now)
  const batch1: Batch = {
    id: uuid(),
    batchNo: batch1No,
    customerId: 'cust_001',
    customerName: '张三',
    customerPhone: '13800138000',
    pickupCode: '123456',
    status: BatchStatus.READY,
    createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    expectedTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    actualPickupTime: null,
    storeId: 'store_001',
    createdBy: 'staff_001',
    totalBaseFee: 95,
    totalOverdueFee: 0,
    discountAmount: 0,
    finalAmount: 95,
    isLocked: false,
    isDayClosed: false,
  }
  batches.push(batch1)

  clothingItems.push({
    id: uuid(),
    batchId: batch1.id,
    barcode: generateClothBarcode(batch1No, 1),
    clothingType: '西装外套',
    color: '藏青色',
    colorRisk: '无',
    valuation: 1500,
    isValuable: true,
    washProject: 'dry_clean',
    basePrice: 45,
    status: ClothingStatus.READY,
    qcStatus: ClothingQcStatus.PASSED,
    isOutsourced: false,
    outsourcedVendor: null,
    isRewashed: false,
    rewashCount: 0,
    isPickedUp: false,
    pickedUpAt: null,
    notified: true,
  })

  clothingItems.push({
    id: uuid(),
    batchId: batch1.id,
    barcode: generateClothBarcode(batch1No, 2),
    clothingType: '西裤',
    color: '黑色',
    colorRisk: '无',
    valuation: 500,
    isValuable: false,
    washProject: 'dry_clean',
    basePrice: 25,
    status: ClothingStatus.READY,
    qcStatus: ClothingQcStatus.PASSED,
    isOutsourced: false,
    outsourcedVendor: null,
    isRewashed: false,
    rewashCount: 0,
    isPickedUp: false,
    pickedUpAt: null,
    notified: true,
  })

  clothingItems.push({
    id: uuid(),
    batchId: batch1.id,
    barcode: generateClothBarcode(batch1No, 3),
    clothingType: '白衬衫',
    color: '白色',
    colorRisk: '易染色',
    valuation: 300,
    isValuable: false,
    washProject: 'water_wash',
    basePrice: 25,
    status: ClothingStatus.QC_FAILED,
    qcStatus: ClothingQcStatus.FAILED,
    isOutsourced: false,
    outsourcedVendor: null,
    isRewashed: false,
    rewashCount: 0,
    isPickedUp: false,
    pickedUpAt: null,
    notified: false,
  })

  qcRecords.push({
    id: uuid(),
    batchId: batch1.id,
    clothingId: clothingItems[0].id,
    result: QcResult.PASS,
    description: null,
    photos: [],
    inspector: 'inspector_001',
    inspectTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    suggestion: null,
  })

  qcRecords.push({
    id: uuid(),
    batchId: batch1.id,
    clothingId: clothingItems[1].id,
    result: QcResult.PASS,
    description: null,
    photos: [],
    inspector: 'inspector_001',
    inspectTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    suggestion: null,
  })

  qcRecords.push({
    id: uuid(),
    batchId: batch1.id,
    clothingId: clothingItems[2].id,
    result: QcResult.FAIL,
    description: '领口有污渍未洗净，需要返洗',
    photos: [],
    inspector: 'inspector_001',
    inspectTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    suggestion: '建议返洗',
  })

  const batch2No = generateBatchSerial('store_001', new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000))
  const batch2: Batch = {
    id: uuid(),
    batchNo: batch2No,
    customerId: 'cust_002',
    customerName: '李四',
    customerPhone: '13900139000',
    pickupCode: '888999',
    status: BatchStatus.OVERDUE,
    createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
    expectedTime: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
    actualPickupTime: null,
    storeId: 'store_001',
    createdBy: 'staff_001',
    totalBaseFee: 65,
    totalOverdueFee: 12,
    discountAmount: 0,
    finalAmount: 77,
    isLocked: false,
    isDayClosed: false,
  }
  batches.push(batch2)

  clothingItems.push({
    id: uuid(),
    batchId: batch2.id,
    barcode: generateClothBarcode(batch2No, 1),
    clothingType: '羊毛衫',
    color: '灰色',
    colorRisk: '无',
    valuation: 800,
    isValuable: false,
    washProject: 'dry_clean',
    basePrice: 45,
    status: ClothingStatus.READY,
    qcStatus: ClothingQcStatus.PASSED,
    isOutsourced: false,
    outsourcedVendor: null,
    isRewashed: false,
    rewashCount: 0,
    isPickedUp: false,
    pickedUpAt: null,
    notified: true,
  })

  clothingItems.push({
    id: uuid(),
    batchId: batch2.id,
    barcode: generateClothBarcode(batch2No, 2),
    clothingType: 'T恤',
    color: '白色',
    colorRisk: '无',
    valuation: 100,
    isValuable: false,
    washProject: 'water_wash',
    basePrice: 20,
    status: ClothingStatus.READY,
    qcStatus: ClothingQcStatus.PASSED,
    isOutsourced: false,
    outsourcedVendor: null,
    isRewashed: false,
    rewashCount: 0,
    isPickedUp: false,
    pickedUpAt: null,
    notified: true,
  })

  qcRecords.push({
    id: uuid(),
    batchId: batch2.id,
    clothingId: clothingItems[3].id,
    result: QcResult.PASS,
    description: null,
    photos: [],
    inspector: 'inspector_001',
    inspectTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    suggestion: null,
  })

  qcRecords.push({
    id: uuid(),
    batchId: batch2.id,
    clothingId: clothingItems[4].id,
    result: QcResult.PASS,
    description: null,
    photos: [],
    inspector: 'inspector_001',
    inspectTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    suggestion: null,
  })

  feeChanges.push({
    id: uuid(),
    batchId: batch2.id,
    changeType: FeeChangeType.OVERDUE,
    amount: 12,
    reason: '超期保管费（超期3天）',
    operator: 'system',
    operateTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
  })

  const batch3No = generateBatchSerial('store_001', new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000))
  const batch3: Batch = {
    id: uuid(),
    batchNo: batch3No,
    customerId: 'cust_003',
    customerName: '王五',
    customerPhone: '13700137000',
    pickupCode: '654321',
    status: BatchStatus.PARTIAL_PICKED,
    createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
    expectedTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    actualPickupTime: null,
    storeId: 'store_001',
    createdBy: 'staff_001',
    totalBaseFee: 120,
    totalOverdueFee: 0,
    discountAmount: 10,
    finalAmount: 110,
    isLocked: false,
    isDayClosed: false,
  }
  batches.push(batch3)

  clothingItems.push({
    id: uuid(),
    batchId: batch3.id,
    barcode: generateClothBarcode(batch3No, 1),
    clothingType: '羽绒服',
    color: '黑色',
    colorRisk: '无',
    valuation: 2000,
    isValuable: true,
    washProject: 'dry_clean',
    basePrice: 80,
    status: ClothingStatus.PICKED_UP,
    qcStatus: ClothingQcStatus.PASSED,
    isOutsourced: false,
    outsourcedVendor: null,
    isRewashed: false,
    rewashCount: 0,
    isPickedUp: true,
    pickedUpAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    notified: true,
  })

  clothingItems.push({
    id: uuid(),
    batchId: batch3.id,
    barcode: generateClothBarcode(batch3No, 2),
    clothingType: '毛衣',
    color: '红色',
    colorRisk: '易褪色',
    valuation: 600,
    isValuable: false,
    washProject: 'water_wash',
    basePrice: 40,
    status: ClothingStatus.READY,
    qcStatus: ClothingQcStatus.PASSED,
    isOutsourced: false,
    outsourcedVendor: null,
    isRewashed: false,
    rewashCount: 0,
    isPickedUp: false,
    pickedUpAt: null,
    notified: true,
  })

  feeChanges.push({
    id: uuid(),
    batchId: batch3.id,
    changeType: FeeChangeType.REDUCTION,
    amount: -10,
    reason: '新顾客首单优惠',
    operator: 'cashier_001',
    operateTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
  })

  const batch4No = generateBatchSerial('store_001', now)
  const batch4: Batch = {
    id: uuid(),
    batchNo: batch4No,
    customerId: 'cust_004',
    customerName: '赵六',
    customerPhone: '13600136000',
    pickupCode: '111222',
    status: BatchStatus.PENDING_QC,
    createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
    expectedTime: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
    actualPickupTime: null,
    storeId: 'store_001',
    createdBy: 'staff_001',
    totalBaseFee: 185,
    totalOverdueFee: 0,
    discountAmount: 0,
    finalAmount: 185,
    isLocked: false,
    isDayClosed: false,
  }
  batches.push(batch4)

  clothingItems.push({
    id: uuid(),
    batchId: batch4.id,
    barcode: generateClothBarcode(batch4No, 1),
    clothingType: '真皮大衣',
    color: '棕色',
    colorRisk: '无',
    valuation: 5000,
    isValuable: true,
    washProject: 'leather',
    basePrice: 120,
    status: ClothingStatus.WASHING,
    qcStatus: ClothingQcStatus.NOT_INSPECTED,
    isOutsourced: true,
    outsourcedVendor: '专业皮具护理中心',
    isRewashed: false,
    rewashCount: 0,
    isPickedUp: false,
    pickedUpAt: null,
    notified: false,
  })

  clothingItems.push({
    id: uuid(),
    batchId: batch4.id,
    barcode: generateClothBarcode(batch4No, 2),
    clothingType: '衬衫',
    color: '蓝色',
    colorRisk: '无',
    valuation: 200,
    isValuable: false,
    washProject: 'iron',
    basePrice: 15,
    status: ClothingStatus.PENDING_QC,
    qcStatus: ClothingQcStatus.NOT_INSPECTED,
    isOutsourced: false,
    outsourcedVendor: null,
    isRewashed: false,
    rewashCount: 0,
    isPickedUp: false,
    pickedUpAt: null,
    notified: false,
  })

  clothingItems.push({
    id: uuid(),
    batchId: batch4.id,
    barcode: generateClothBarcode(batch4No, 3),
    clothingType: '西装套装',
    color: '深灰色',
    colorRisk: '无',
    valuation: 3000,
    isValuable: true,
    washProject: 'dry_clean',
    basePrice: 50,
    status: ClothingStatus.PENDING_WASH,
    qcStatus: ClothingQcStatus.NOT_INSPECTED,
    isOutsourced: false,
    outsourcedVendor: null,
    isRewashed: false,
    rewashCount: 0,
    isPickedUp: false,
    pickedUpAt: null,
    notified: false,
  })

  const batch5No = generateBatchSerial('store_002', new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000))
  const batch5: Batch = {
    id: uuid(),
    batchNo: batch5No,
    customerId: 'cust_001',
    customerName: '张三',
    customerPhone: '13800138000',
    pickupCode: '333444',
    status: BatchStatus.COMPLETED,
    createdAt: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
    expectedTime: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    actualPickupTime: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
    storeId: 'store_002',
    createdBy: 'staff_002',
    totalBaseFee: 55,
    totalOverdueFee: 0,
    discountAmount: 0,
    finalAmount: 55,
    isLocked: false,
    isDayClosed: true,
  }
  batches.push(batch5)

  clothingItems.push({
    id: uuid(),
    batchId: batch5.id,
    barcode: generateClothBarcode(batch5No, 1),
    clothingType: '休闲裤',
    color: '卡其色',
    colorRisk: '无',
    valuation: 300,
    isValuable: false,
    washProject: 'water_wash',
    basePrice: 20,
    status: ClothingStatus.PICKED_UP,
    qcStatus: ClothingQcStatus.PASSED,
    isOutsourced: false,
    outsourcedVendor: null,
    isRewashed: false,
    rewashCount: 0,
    isPickedUp: true,
    pickedUpAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
    notified: true,
  })

  clothingItems.push({
    id: uuid(),
    batchId: batch5.id,
    barcode: generateClothBarcode(batch5No, 2),
    clothingType: 'T恤',
    color: '白色',
    colorRisk: '无',
    valuation: 80,
    isValuable: false,
    washProject: 'water_wash',
    basePrice: 20,
    status: ClothingStatus.PICKED_UP,
    qcStatus: ClothingQcStatus.PASSED,
    isOutsourced: false,
    outsourcedVendor: null,
    isRewashed: false,
    rewashCount: 0,
    isPickedUp: true,
    pickedUpAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
    notified: true,
  })

  compensations.push({
    id: uuid(),
    batchId: batch1.id,
    clothingId: clothingItems[2].id,
    applyAmount: 100,
    approveAmount: 0,
    reason: '衣物洗后发现轻微染色',
    applicant: 'staff_001',
    approver: null,
    status: CompensationStatus.PENDING,
    applyTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    approveTime: null,
  })

  rewashRecords.push({
    id: uuid(),
    batchId: batch1.id,
    clothingId: clothingItems[2].id,
    reason: '领口污渍未洗净',
    operator: 'inspector_001',
    newBatchId: null,
    createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    status: RewashStatus.PENDING,
  })

  pickupLogs.push({
    id: uuid(),
    batchId: batch1.id,
    inputCode: '123456',
    inputPhone: null,
    isSuccess: true,
    failReason: null,
    attemptTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    operatorIp: '127.0.0.1',
  })

  pickupLogs.push({
    id: uuid(),
    batchId: batch2.id,
    inputCode: '000000',
    inputPhone: null,
    isSuccess: false,
    failReason: '取件码错误',
    attemptTime: new Date(now.getTime() - 1 * 60 * 60 * 1000),
    operatorIp: '127.0.0.1',
  })

  pickupLogs.push({
    id: uuid(),
    batchId: batch2.id,
    inputCode: '111111',
    inputPhone: null,
    isSuccess: false,
    failReason: '取件码错误',
    attemptTime: new Date(now.getTime() - 30 * 60 * 1000),
    operatorIp: '127.0.0.1',
  })

  pickupLogs.push({
    id: uuid(),
    batchId: batch2.id,
    inputCode: '222222',
    inputPhone: null,
    isSuccess: false,
    failReason: '取件码错误，已锁定',
    attemptTime: new Date(now.getTime() - 20 * 60 * 1000),
    operatorIp: '127.0.0.1',
  })

  lockRecords.push({
    id: uuid(),
    batchId: batch2.id,
    lockType: LockType.PICKUP_CODE,
    reason: '连续3次取件码验证失败',
    lockedAt: new Date(now.getTime() - 20 * 60 * 1000),
    lockedBy: 'system',
    isUnlocked: false,
    unlockedBy: null,
    unlockedAt: null,
    remark: null,
    autoUnlockAt: new Date(now.getTime() + 40 * 60 * 1000),
  })

  return {
    batches,
    clothingItems,
    customers,
    stores,
    pricePackages,
    members,
    qcRecords,
    rewashRecords,
    compensations,
    lockRecords,
    feeChanges,
    pickupLogs,
    transfers,
    isInitialized: true,
  }
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      batches: [],
      clothingItems: [],
      customers: [],
      stores: [],
      pricePackages: [],
      members: [],
      qcRecords: [],
      rewashRecords: [],
      compensations: [],
      lockRecords: [],
      feeChanges: [],
      pickupLogs: [],
      transfers: [],
      isInitialized: false,

      initDemoData: () => {
        const state = get()
        if (state.batches.length > 0 && state.isInitialized) return

        const demo = createDemoData()
        set(demo)
      },

      clearAllData: () => {
        set({
          batches: [],
          clothingItems: [],
          customers: [],
          stores: [],
          pricePackages: [],
          members: [],
          qcRecords: [],
          rewashRecords: [],
          compensations: [],
          lockRecords: [],
          feeChanges: [],
          pickupLogs: [],
          transfers: [],
          isInitialized: false,
        })
      },

      createBatch: (batchData, items) => {
        const now = new Date()
        const batchNo = generateBatchSerial(batchData.storeId, now)
        const batchId = uuid()

        const clothingItems: ClothingItem[] = items.map((item, idx) => ({
          id: uuid(),
          batchId,
          barcode: generateClothBarcode(batchNo, idx + 1),
          clothingType: item.clothingType,
          color: item.color,
          colorRisk: item.colorRisk,
          valuation: item.valuation,
          isValuable: item.isValuable,
          washProject: item.washProject,
          basePrice: item.basePrice,
          status: ClothingStatus.PENDING_WASH,
          qcStatus: ClothingQcStatus.NOT_INSPECTED,
          isOutsourced: item.isOutsourced ?? false,
          outsourcedVendor: item.outsourcedVendor ?? null,
          isRewashed: false,
          rewashCount: 0,
          isPickedUp: false,
          pickedUpAt: null,
          notified: false,
        }))

        const totalBaseFee = clothingItems.reduce((sum, c) => sum + c.basePrice, 0)

        const batch: Batch = {
          id: batchId,
          batchNo,
          customerId: batchData.customerId,
          customerName: batchData.customerName,
          customerPhone: batchData.customerPhone,
          pickupCode: generatePickupCode(),
          status: BatchStatus.PENDING_QC,
          createdAt: now,
          expectedTime: batchData.expectedTime ?? new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
          actualPickupTime: null,
          storeId: batchData.storeId,
          createdBy: batchData.createdBy,
          totalBaseFee,
          totalOverdueFee: 0,
          discountAmount: 0,
          finalAmount: totalBaseFee,
          isLocked: false,
          isDayClosed: false,
        }

        set((state) => ({
          batches: [...state.batches, batch],
          clothingItems: [...state.clothingItems, ...clothingItems],
        }))

        return batch
      },

      splitBatch: (batchId, selectedClothingIds) => {
        const state = get()
        const originalBatch = state.batches.find((b) => b.id === batchId)
        if (!originalBatch) throw new Error('批次不存在')

        const now = new Date()
        const newBatchNo = generateBatchSerial(originalBatch.storeId, now)
        const newBatchId = uuid()

        const selectedItems = state.clothingItems.filter((c) => selectedClothingIds.includes(c.id))
        const remainingItems = state.clothingItems.filter(
          (c) => c.batchId === batchId && !selectedClothingIds.includes(c.id)
        )

        if (selectedItems.length === 0 || remainingItems.length === 0) {
          throw new Error('拆分后两批都必须有衣物')
        }

        const updatedClothingItems = state.clothingItems
          .filter((c) => c.batchId !== batchId || !selectedClothingIds.includes(c.id))
          .concat(
            selectedItems.map((c, idx) => ({
              ...c,
              batchId: newBatchId,
              barcode: generateClothBarcode(newBatchNo, idx + 1),
            }))
          )

        const newTotalBaseFee = selectedItems.reduce((sum, c) => sum + c.basePrice, 0)

        const newBatch: Batch = {
          ...originalBatch,
          id: newBatchId,
          batchNo: newBatchNo,
          pickupCode: generatePickupCode(),
          createdAt: now,
          totalBaseFee: newTotalBaseFee,
          finalAmount: newTotalBaseFee,
          totalOverdueFee: 0,
          discountAmount: 0,
          status: BatchStatus.PENDING_QC,
          isDayClosed: false,
        }

        const updatedBatches = state.batches
          .map((b) => {
            if (b.id === batchId) {
              const remainingTotalBaseFee = remainingItems.reduce((sum, c) => sum + c.basePrice, 0)
              return {
                ...b,
                totalBaseFee: remainingTotalBaseFee,
                finalAmount: remainingTotalBaseFee,
                status: BatchStatus.PENDING_QC,
              }
            }
            return b
          })
          .concat(newBatch)

        set({
          batches: updatedBatches,
          clothingItems: updatedClothingItems,
        })

        get().recalculateBatchStatus(newBatchId)
        get().recalculateBatchStatus(batchId)

        return newBatch
      },

      addClothingToBatch: (batchId, clothing) => {
        const state = get()
        const batch = state.batches.find((b) => b.id === batchId)
        if (!batch) throw new Error('批次不存在')

        const existingInBatch = state.clothingItems.filter((c) => c.batchId === batchId)
        const newClothing: ClothingItem = {
          id: uuid(),
          batchId,
          barcode: generateClothBarcode(batch.batchNo, existingInBatch.length + 1),
          clothingType: clothing.clothingType,
          color: clothing.color,
          colorRisk: clothing.colorRisk,
          valuation: clothing.valuation,
          isValuable: clothing.isValuable,
          washProject: clothing.washProject,
          basePrice: clothing.basePrice,
          status: ClothingStatus.PENDING_WASH,
          qcStatus: ClothingQcStatus.NOT_INSPECTED,
          isOutsourced: clothing.isOutsourced ?? false,
          outsourcedVendor: clothing.outsourcedVendor ?? null,
          isRewashed: false,
          rewashCount: 0,
          isPickedUp: false,
          pickedUpAt: null,
          notified: false,
        }

        const batchClothing = [...existingInBatch, newClothing]
        const newTotalBaseFee = batchClothing.reduce((sum, c) => sum + c.basePrice, 0)

        set((state) => ({
          clothingItems: [...state.clothingItems, newClothing],
          batches: state.batches.map((b) =>
            b.id === batchId
              ? {
                  ...b,
                  totalBaseFee: newTotalBaseFee,
                  finalAmount: newTotalBaseFee,
                  status: BatchStatus.PENDING_QC,
                }
              : b
          ),
        }))

        return newClothing
      },

      updateClothingStatus: (clothingId, status, qcStatus) => {
        set((state) => {
          const updatedItems = state.clothingItems.map((c) => {
            if (c.id === clothingId) {
              return {
                ...c,
                status,
                qcStatus: qcStatus ?? c.qcStatus,
                isRewashed: status === ClothingStatus.REWASHING ? true : c.isRewashed,
                rewashCount: status === ClothingStatus.REWASHING ? c.rewashCount + 1 : c.rewashCount,
              }
            }
            return c
          })

          const updatedItem = updatedItems.find((c) => c.id === clothingId)
          if (!updatedItem) return { clothingItems: updatedItems }

          const batchId = updatedItem.batchId
          const batch = state.batches.find((b) => b.id === batchId)
          if (!batch) return { clothingItems: updatedItems }

          const batchClothing = updatedItems.filter((c) => c.batchId === batchId)
          const lockRecords = state.lockRecords.filter((l) => l.batchId === batchId)
          const feeChanges = state.feeChanges.filter((f) => f.batchId === batchId)
          const qcRecords = state.qcRecords.filter((q) => q.batchId === batchId)
          const statusResult = calcBatchStatus(batch, batchClothing, lockRecords, feeChanges, qcRecords)

          return {
            clothingItems: updatedItems,
            batches: state.batches.map((b) =>
              b.id === batchId ? { ...b, status: statusResult.status, isLocked: statusResult.isLocked } : b
            ),
          }
        })
      },

      markPickedUp: (batchId, clothingIds, operator) => {
        const now = new Date()
        let pickedItems: ClothingItem[] = []

        const batch = get().batches.find((b) => b.id === batchId)
        if (!batch) throw new Error('批次不存在')

        if (batch.isDayClosed) {
          throw new Error('已日结的批次不能取件')
        }

        const state = get()
        const batchClothing = state.clothingItems.filter((c) => c.batchId === batchId)
        const itemsToPick = batchClothing.filter(
          (c) => clothingIds.includes(c.id) && !c.isPickedUp
        )

        const allReady = itemsToPick.every(
          (c) => c.status === ClothingStatus.READY || c.status === ClothingStatus.QC_PASSED
        )
        if (!allReady) {
          throw new Error('存在未完成质检的衣物，无法取件')
        }

        const hasFailed = itemsToPick.some(
          (c) => c.qcStatus === ClothingQcStatus.FAILED || c.qcStatus === ClothingQcStatus.EXCEPTION
        )
        if (hasFailed) {
          throw new Error('存在质检异常的衣物，无法取件')
        }

        set((state) => {
          const updatedItems = state.clothingItems.map((c) => {
            if (c.batchId === batchId && clothingIds.includes(c.id) && !c.isPickedUp) {
              const picked = {
                ...c,
                isPickedUp: true,
                pickedUpAt: now,
                status: ClothingStatus.PICKED_UP,
              }
              pickedItems.push(picked)
              return picked
            }
            return c
          })

          const newBatchClothing = updatedItems.filter((c) => c.batchId === batchId)
          const allPicked = newBatchClothing.every((c) => c.isPickedUp)
          const lockRecords = state.lockRecords.filter((l) => l.batchId === batchId)
          const feeChanges = state.feeChanges.filter((f) => f.batchId === batchId)
          const qcRecords = state.qcRecords.filter((q) => q.batchId === batchId)

          const batchObj = state.batches.find((b) => b.id === batchId)!
          const statusResult = calcBatchStatus(batchObj, newBatchClothing, lockRecords, feeChanges, qcRecords)

          return {
            clothingItems: updatedItems,
            batches: state.batches.map((b) =>
              b.id === batchId
                ? {
                    ...b,
                    status: statusResult.status,
                    actualPickupTime: allPicked ? now : b.actualPickupTime,
                    isLocked: statusResult.isLocked,
                  }
                : b
            ),
          }
        })

        const totalFee = pickedItems.reduce((sum, c) => sum + c.basePrice, 0)
        return { pickedItems, totalFee }
      },

      getBatchById: (id) => {
        const state = get()
        const batch = state.batches.find((b) => b.id === id)
        if (!batch) return undefined
        const clothingItems = state.clothingItems.filter((c) => c.batchId === id)
        return {
          ...batch,
          phone: batch.customerPhone,
          clothingItems,
          totalFee: batch.finalAmount,
        }
      },

      getClothingByBatchId: (batchId) => {
        return get().clothingItems.filter((c) => c.batchId === batchId)
      },

      searchBatches: (keyword, status) => {
        const state = get()
        let result = state.batches

        if (keyword) {
          const kw = keyword.toLowerCase()
          result = result.filter(
            (b) =>
              b.batchNo.toLowerCase().includes(kw) ||
              b.customerName.toLowerCase().includes(kw) ||
              b.customerPhone.includes(kw) ||
              b.pickupCode.includes(kw)
          )
        }

        if (status) {
          result = result.filter((b) => b.status === status)
        }

        return result
      },

      getQcBatches: () => {
        const state = get()
        const qcStatuses = [
          BatchStatus.PENDING_QC,
          BatchStatus.QC_PARTIAL,
          BatchStatus.QC_FAILED,
        ]
        return state.batches.filter((b) => qcStatuses.includes(b.status))
      },

      markDayClosed: (batchIds, operator) => {
        set((state) => ({
          batches: state.batches.map((b) =>
            batchIds.includes(b.id) ? { ...b, isDayClosed: true } : b
          ),
        }))
      },

      recalculateBatchStatus: (batchId) => {
        set((state) => {
          const batch = state.batches.find((b) => b.id === batchId)
          if (!batch) return state

          const batchClothing = state.clothingItems.filter((c) => c.batchId === batchId)
          const lockRecords = state.lockRecords.filter((l) => l.batchId === batchId)
          const feeChanges = state.feeChanges.filter((f) => f.batchId === batchId)
          const qcRecords = state.qcRecords.filter((q) => q.batchId === batchId)
          const statusResult = calcBatchStatus(batch, batchClothing, lockRecords, feeChanges, qcRecords)

          return {
            batches: state.batches.map((b) =>
              b.id === batchId ? { ...b, status: statusResult.status, isLocked: statusResult.isLocked } : b
            ),
          }
        })
      },

      recalculateAllBatchStatuses: () => {
        set((state) => {
          const updatedBatches = state.batches.map((batch) => {
            const batchClothing = state.clothingItems.filter((c) => c.batchId === batch.id)
            const lockRecords = state.lockRecords.filter((l) => l.batchId === batch.id)
            const feeChanges = state.feeChanges.filter((f) => f.batchId === batch.id)
            const qcRecords = state.qcRecords.filter((q) => q.batchId === batch.id)
            const statusResult = calcBatchStatus(batch, batchClothing, lockRecords, feeChanges, qcRecords)
            return { ...batch, status: statusResult.status, isLocked: statusResult.isLocked }
          })
          return { batches: updatedBatches }
        })
      },

      submitQc: (input) => {
        const now = new Date()
        const record: QcRecord = {
          id: uuid(),
          batchId: input.batchId,
          clothingId: input.clothingId,
          result: input.result,
          description: input.description ?? null,
          photos: input.photos ?? [],
          inspector: input.inspector,
          inspectTime: now,
          suggestion: input.suggestion ?? null,
        }

        let clothingStatus: ClothingStatus
        let qcStatus: ClothingQcStatus

        switch (input.result) {
          case QcResult.PASS:
            clothingStatus = ClothingStatus.QC_PASSED
            qcStatus = ClothingQcStatus.PASSED
            break
          case QcResult.FAIL:
            clothingStatus = ClothingStatus.QC_FAILED
            qcStatus = ClothingQcStatus.FAILED
            break
          case QcResult.EXCEPTION:
            clothingStatus = ClothingStatus.QC_EXCEPTION
            qcStatus = ClothingQcStatus.EXCEPTION
            break
          default:
            clothingStatus = ClothingStatus.PENDING_QC
            qcStatus = ClothingQcStatus.NOT_INSPECTED
        }

        const { updateClothingStatus } = get()
        updateClothingStatus(input.clothingId, clothingStatus, qcStatus)

        set((state) => ({
          qcRecords: [...state.qcRecords, record],
        }))

        return record
      },

      createRewash: (batchId, clothingId, reason, operator) => {
        const now = new Date()
        const rewash: RewashRecord = {
          id: uuid(),
          batchId,
          clothingId,
          reason,
          operator,
          newBatchId: null,
          createdAt: now,
          status: RewashStatus.PROCESSING,
        }

        const { updateClothingStatus } = get()
        updateClothingStatus(clothingId, ClothingStatus.REWASHING)

        set((state) => ({
          rewashRecords: [...state.rewashRecords, rewash],
        }))

        return rewash
      },

      submitCompensation: (data) => {
        const now = new Date()
        const compensation: Compensation = {
          id: uuid(),
          batchId: data.batchId,
          clothingId: data.clothingId,
          applyAmount: data.applyAmount,
          approveAmount: 0,
          reason: data.reason,
          applicant: data.applicant,
          approver: null,
          status: CompensationStatus.PENDING,
          applyTime: now,
          approveTime: null,
        }

        set((state) => ({
          compensations: [...state.compensations, compensation],
        }))

        return compensation
      },

      approveCompensation: (id, approvedAmount, approver) => {
        const now = new Date()
        set((state) => ({
          compensations: state.compensations.map((c) =>
            c.id === id
              ? {
                  ...c,
                  approveAmount: approvedAmount,
                  approver,
                  status: CompensationStatus.APPROVED,
                  approveTime: now,
                }
              : c
          ),
        }))
      },

      rejectCompensation: (id, approver) => {
        const now = new Date()
        set((state) => ({
          compensations: state.compensations.map((c) =>
            c.id === id
              ? {
                  ...c,
                  approver,
                  status: CompensationStatus.REJECTED,
                  approveTime: now,
                }
              : c
          ),
        }))
      },

      verifyPickupCode: (batchId, code) => {
        const { getBatchById } = get()
        const batch = getBatchById(batchId)

        if (!batch) {
          return { success: false, remainingAttempts: 0, isLocked: false }
        }

        const isLocked = get().isBatchLocked(batchId)
        if (isLocked) {
          return { success: false, remainingAttempts: 0, isLocked: true }
        }

        const failedAttempts = get().getFailedAttempts(batchId)
        const remaining = MAX_PICKUP_ATTEMPTS - failedAttempts - 1

        if (batch.pickupCode === code) {
          get().recordPickupAttempt(batchId, code, true)
          return { success: true, remainingAttempts: Math.max(0, remaining), isLocked: false }
        } else {
          get().recordPickupAttempt(batchId, code, false, '取件码错误')

          if (remaining <= 0) {
            get().lockBatch(
              batchId,
              LockType.PICKUP_CODE,
              `连续输错取件码超过${MAX_PICKUP_ATTEMPTS}次`
            )
            return { success: false, remainingAttempts: 0, isLocked: true }
          }

          return { success: false, remainingAttempts: Math.max(0, remaining), isLocked: false }
        }
      },

      verifyByPhone: (phone) => {
        const { batches } = get()
        return batches.filter((b) => b.customerPhone === phone)
      },

      lockBatch: (batchId, lockType, reason, operator) => {
        const now = new Date()
        const lock: LockRecord = {
          id: uuid(),
          batchId,
          lockType,
          reason,
          isUnlocked: false,
          lockedBy: operator || null,
          unlockedBy: null,
          remark: null,
          lockedAt: now,
          unlockedAt: null,
          autoUnlockAt: null,
        }

        set((state) => {
          const updatedBatches = state.batches.map((b) =>
            b.id === batchId ? { ...b, isLocked: true, status: BatchStatus.LOCKED } : b
          )
          return {
            batches: updatedBatches,
            lockRecords: [...state.lockRecords, lock],
          }
        })
      },

      unlockBatch: (batchId, operator, reason) => {
        const now = new Date()

        set((state) => {
          const updatedLocks = state.lockRecords.map((l) =>
            l.batchId === batchId && !l.isUnlocked
              ? {
                  ...l,
                  isUnlocked: true,
                  unlockedBy: operator,
                  remark: reason,
                  unlockedAt: now,
                }
              : l
          )

          const batch = state.batches.find((b) => b.id === batchId)
          let updatedBatches = state.batches
          if (batch) {
            const batchClothing = state.clothingItems.filter((c) => c.batchId === batchId)
            const feeChanges = state.feeChanges.filter((f) => f.batchId === batchId)
            const qcRecords = state.qcRecords.filter((q) => q.batchId === batchId)
            const statusResult = calcBatchStatus(batch, batchClothing, [], feeChanges, qcRecords)
            updatedBatches = state.batches.map((b) =>
              b.id === batchId ? { ...b, isLocked: false, status: statusResult.status } : b
            )
          }

          return {
            lockRecords: updatedLocks,
            batches: updatedBatches,
          }
        })
      },

      recordPickupAttempt: (batchId, input, isSuccess, failReason) => {
        const now = new Date()
        const isCode = /^\d{6}$/.test(input)

        const log: PickupLog = {
          id: uuid(),
          batchId,
          inputCode: isCode ? input : null,
          inputPhone: !isCode ? input : null,
          isSuccess,
          failReason: failReason ?? null,
          attemptTime: now,
          operatorIp: getClientIp(),
        }

        set((state) => ({
          pickupLogs: [...state.pickupLogs, log],
        }))
      },

      createTransfer: (fromStoreId, toStoreId, clothingIds, operator) => {
        const now = new Date()
        const transfer: Transfer = {
          id: uuid(),
          fromStoreId,
          toStoreId,
          clothingIds,
          operator,
          status: TransferStatus.IN_TRANSIT,
          createdAt: now,
          receivedAt: null,
        }

        set((state) => ({
          transfers: [...state.transfers, transfer],
        }))

        clothingIds.forEach((id) => {
          get().updateClothingStatus(id, ClothingStatus.TRANSFERRED)
        })

        return transfer
      },

      getFailedAttempts: (batchId) => {
        return get().pickupLogs.filter(
          (l) => l.batchId === batchId && !l.isSuccess
        ).length
      },

      isBatchLocked: (batchId) => {
        return get().lockRecords.some((l) => l.batchId === batchId && !l.isUnlocked)
      },

      applyFeeChange: (batchId, changeType, amount, reason, operator) => {
        if (!reason || reason.trim() === '') {
          throw new Error('费用变更必须填写原因')
        }

        const now = new Date()
        const feeChange: FeeChange = {
          id: uuid(),
          batchId,
          changeType,
          amount,
          reason,
          operator,
          operateTime: now,
        }

        set((state) => {
          const batch = state.batches.find((b) => b.id === batchId)
          if (!batch) return { feeChanges: [...state.feeChanges, feeChange] }

          let newDiscountAmount = batch.discountAmount
          let newFinalAmount = batch.finalAmount

          if (amount < 0) {
            newDiscountAmount = batch.discountAmount + Math.abs(amount)
            newFinalAmount = Math.max(0, batch.finalAmount + amount)
          } else {
            newFinalAmount = batch.finalAmount + amount
          }

          return {
            feeChanges: [...state.feeChanges, feeChange],
            batches: state.batches.map((b) =>
              b.id === batchId
                ? {
                    ...b,
                    discountAmount: Math.round(newDiscountAmount * 100) / 100,
                    finalAmount: Math.round(newFinalAmount * 100) / 100,
                  }
                : b
            ),
          }
        })

        return feeChange
      },

      reverseFeeChange: (changeId, operator) => {
        const change = get().feeChanges.find((c) => c.id === changeId)
        if (!change) return

        const now = new Date()
        const reverseChange: FeeChange = {
          id: uuid(),
          batchId: change.batchId,
          changeType: FeeChangeType.ADJUST,
          amount: -change.amount,
          reason: `冲正操作，原单号:${change.id}`,
          operator,
          operateTime: now,
        }

        set((state) => {
          const batch = state.batches.find((b) => b.id === change.batchId)
          if (!batch) return { feeChanges: [...state.feeChanges, reverseChange] }

          const newDiscountAmount = Math.max(0, batch.discountAmount - Math.abs(change.amount))
          const newFinalAmount = batch.finalAmount - change.amount

          return {
            feeChanges: [...state.feeChanges, reverseChange],
            batches: state.batches.map((b) =>
              b.id === change.batchId
                ? {
                    ...b,
                    discountAmount: Math.round(newDiscountAmount * 100) / 100,
                    finalAmount: Math.round(newFinalAmount * 100) / 100,
                  }
                : b
            ),
          }
        })
      },

      calculateBatchFee: (batchId, partialClothingIds) => {
        const state = get()
        const batch = state.batches.find((b) => b.id === batchId)
        if (!batch) {
          return {
            baseFee: 0,
            discountAmount: 0,
            packageDeduction: 0,
            overdueFee: 0,
            adjustments: [],
            totalPayable: 0,
            clothBreakdown: {},
          }
        }

        const clothingItems = state.clothingItems.filter((c) => c.batchId === batchId)
        const feeChanges = state.feeChanges.filter((f) => f.batchId === batchId)

        const customer = state.customers.find((c) => c.id === batch.customerId)
        const member = customer?.memberId
          ? state.members.find((m) => m.id === customer.memberId) || null
          : null
        const pricePackage = member?.packageId
          ? state.pricePackages.find((p) => p.id === member!.packageId) || null
          : null

        if (partialClothingIds && partialClothingIds.length > 0) {
          return calcPartialPickupFee(
            batch,
            clothingItems,
            partialClothingIds,
            feeChanges,
            member,
            pricePackage
          )
        }

        return calcBatchFee(batch, clothingItems, feeChanges, member, pricePackage)
      },

      getMemberById: (memberId) => {
        if (!memberId) return null
        return get().members.find((m) => m.id === memberId) || null
      },

      getPricePackageById: (packageId) => {
        if (!packageId) return null
        return get().pricePackages.find((p) => p.id === packageId) || null
      },

      getCustomerByPhone: (phone) => {
        return get().customers.find((c) => c.phone === phone)
      },

      getBatchStatusInfo: (batchId) => {
        const state = get()
        const batch = state.batches.find((b) => b.id === batchId)
        if (!batch) return null

        const clothingItems = state.clothingItems.filter((c) => c.batchId === batchId)
        const lockRecords = state.lockRecords.filter((l) => l.batchId === batchId)
        const feeChanges = state.feeChanges.filter((f) => f.batchId === batchId)
        const qcRecords = state.qcRecords.filter((q) => q.batchId === batchId)

        return calcBatchStatus(batch, clothingItems, lockRecords, feeChanges, qcRecords)
      },

      canRevertBatch: (batchId) => {
        const state = get()
        const batch = state.batches.find((b) => b.id === batchId)
        if (!batch) return false

        const clothingItems = state.clothingItems.filter((c) => c.batchId === batchId)
        const lockRecords = state.lockRecords.filter((l) => l.batchId === batchId)

        return canRevertBatch(batch, clothingItems, lockRecords)
      },
    }),
    {
      name: 'laundry-app',
      storage: createJSONStorage(() => zustandStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isInitialized = true
        }
      },
    }
  )
)
