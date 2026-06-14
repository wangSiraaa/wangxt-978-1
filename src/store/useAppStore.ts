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
import {
  calcBatchStatus,
  canRevertBatch,
  canNotifyBatchPickup,
  canCompleteBatch,
  validateClothStatusTransition,
  createStatusTransition,
  canCompleteRewash,
  canMarkRewashFailed,
  canApplyCompensation,
  canOutsource,
  canTransfer,
} from '../utils/statusCalc'
import {
  calcBatchFee,
  calcPartialPickupFee,
  type FeeBreakdown,
  validateFeeChange,
  validateFeeChangeReason,
} from '../utils/feeCalc'

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
  updateClothingStatusWithHistory: (
    clothingId: string,
    status: ClothingStatus,
    operator: string,
    remark?: string,
  ) => void
  completeRewash: (clothingId: string, operator: string, result?: string) => void
  markRewashFailed: (clothingId: string, operator: string, reason: string) => void
  applyCorrection: (
    batchId: string,
    amount: number,
    reason: string,
    operator: string,
  ) => FeeChange
  authorizePickup: (
    customerId: string,
    authorizedPhone: string,
    authorizedName: string,
    operator: string,
  ) => void
  outsourceClothing: (
    clothingIds: string[],
    vendor: string,
    operator: string,
  ) => void
  receiveOutsourced: (
    clothingIds: string[],
    operator: string,
  ) => void
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
  verifyPickupInput: (type: 'code' | 'phone', input: string) => {
    success: boolean
    remainingAttempts: number
    isLocked: boolean
    matchedBatches: Batch[]
    contextKey: string
  }
  verifyPickupCode: (batchId: string, code: string) => { success: boolean; remainingAttempts: number; isLocked: boolean; contextKey: string }
  verifyByPhone: (phone: string) => Batch[]
  lockByContext: (contextKey: string, batchIds: string[], lockType: LockType, reason: string, operator?: string) => void
  lockBatch: (batchId: string, lockType: LockType, reason: string, operator?: string) => void
  unlockBatch: (batchId: string, operator: string, reason: string) => void
  unlockByContext: (contextKey: string, operator: string, reason: string) => void
  recordPickupAttempt: (contextKey: string, batchId: string | null, input: string, isSuccess: boolean, failReason?: string) => void
  createTransfer: (fromStoreId: string, toStoreId: string, clothingIds: string[], operator: string) => Transfer
  getFailedAttempts: (batchId: string) => number
  getFailedAttemptsByContext: (contextKey: string) => number
  isBatchLocked: (batchId: string) => boolean
  isContextLocked: (contextKey: string) => boolean
  getLockRecordByContext: (contextKey: string) => LockRecord | null
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
    rewashFailedCount: 0,
    isPickedUp: false,
    pickedUpAt: null,
    transferId: null,
    notified: true,
    statusHistory: [],
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
    rewashFailedCount: 0,
    isPickedUp: false,
    pickedUpAt: null,
    transferId: null,
    notified: true,
    statusHistory: [],
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
    rewashFailedCount: 0,
    isPickedUp: false,
    pickedUpAt: null,
    transferId: null,
    notified: false,
    statusHistory: [],
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
    rewashFailedCount: 0,
    isPickedUp: false,
    pickedUpAt: null,
    transferId: null,
    notified: true,
    statusHistory: [],
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
    rewashFailedCount: 0,
    isPickedUp: false,
    pickedUpAt: null,
    transferId: null,
    notified: true,
    statusHistory: [],
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
    createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
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
    rewashFailedCount: 0,
    isPickedUp: true,
    pickedUpAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    transferId: null,
    notified: true,
    statusHistory: [],
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
    rewashFailedCount: 0,
    isPickedUp: false,
    pickedUpAt: null,
    transferId: null,
    notified: true,
    statusHistory: [],
  })

  feeChanges.push({
    id: uuid(),
    batchId: batch3.id,
    changeType: FeeChangeType.REDUCTION,
    amount: -10,
    reason: '新顾客首单优惠',
    operator: 'cashier_001',
    operateTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
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
    rewashFailedCount: 0,
    isPickedUp: false,
    pickedUpAt: null,
    transferId: null,
    notified: false,
    statusHistory: [],
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
    rewashFailedCount: 0,
    isPickedUp: false,
    pickedUpAt: null,
    transferId: null,
    notified: false,
    statusHistory: [],
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
    rewashFailedCount: 0,
    isPickedUp: false,
    pickedUpAt: null,
    transferId: null,
    notified: false,
    statusHistory: [],
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
    rewashFailedCount: 0,
    isPickedUp: true,
    pickedUpAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
    transferId: null,
    notified: true,
    statusHistory: [],
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
    rewashFailedCount: 0,
    isPickedUp: true,
    pickedUpAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
    transferId: null,
    notified: true,
    statusHistory: [],
  })

  compensations.push({
    id: uuid(),
    batchId: batch1.id,
    clothingId: clothingItems[2].id,
    applyAmount: 100,
    approveAmount: 0,
    amount: 0,
    reason: '衣物洗后发现轻微染色',
    applicant: 'staff_001',
    approver: null,
    createdBy: 'staff_001',
    status: CompensationStatus.PENDING,
    applyTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    approveTime: null,
    createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
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
    contextKey: batch1.customerPhone ? `phone:${batch1.customerPhone}` : `batch:${batch1.id}`,
    inputCode: '123456',
    inputPhone: null,
    isSuccess: true,
    failReason: null,
    attemptTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    operatorIp: '127.0.0.1',
  })

  const batch2CtxKey = batch2.customerPhone ? `phone:${batch2.customerPhone}` : `batch:${batch2.id}`

  pickupLogs.push({
    id: uuid(),
    batchId: batch2.id,
    contextKey: batch2CtxKey,
    inputCode: '000000',
    inputPhone: null,
    isSuccess: false,
    failReason: '取件码错误（第1次）',
    attemptTime: new Date(now.getTime() - 1 * 60 * 60 * 1000),
    operatorIp: '192.168.1.10',
  })

  pickupLogs.push({
    id: uuid(),
    batchId: batch2.id,
    contextKey: batch2CtxKey,
    inputCode: '111111',
    inputPhone: null,
    isSuccess: false,
    failReason: '取件码错误（第2次）',
    attemptTime: new Date(now.getTime() - 30 * 60 * 1000),
    operatorIp: '192.168.1.10',
  })

  pickupLogs.push({
    id: uuid(),
    batchId: batch2.id,
    contextKey: batch2CtxKey,
    inputCode: '222222',
    inputPhone: null,
    isSuccess: false,
    failReason: '取件码错误（第3次），已触发锁定',
    attemptTime: new Date(now.getTime() - 25 * 60 * 1000),
    operatorIp: '192.168.1.10',
  })

  lockRecords.push({
    id: uuid(),
    batchId: batch2.id,
    contextKey: batch2CtxKey,
    lockType: LockType.PICKUP_CODE,
    reason: '连续3次取件码验证失败，按手机号上下文累计锁定',
    lockedAt: new Date(now.getTime() - 25 * 60 * 1000),
    lockedBy: 'system',
    isUnlocked: false,
    unlockedBy: null,
    unlockedAt: null,
    remark: null,
    autoUnlockAt: new Date(now.getTime() + 35 * 60 * 1000),
  })

  const batch4CtxKey = batch4.customerPhone ? `phone:${batch4.customerPhone}` : `batch:${batch4.id}`

  pickupLogs.push({
    id: uuid(),
    batchId: batch4.id,
    contextKey: batch4CtxKey,
    inputCode: '999999',
    inputPhone: null,
    isSuccess: false,
    failReason: '取件码错误（第1次，手机号上下文累计）',
    attemptTime: new Date(now.getTime() - 4 * 60 * 60 * 1000),
    operatorIp: '192.168.1.22',
  })

  pickupLogs.push({
    id: uuid(),
    batchId: batch4.id,
    contextKey: batch4CtxKey,
    inputCode: '888888',
    inputPhone: null,
    isSuccess: false,
    failReason: '取件码错误（第2次，手机号上下文累计）',
    attemptTime: new Date(now.getTime() - 3 * 60 * 60 * 1000),
    operatorIp: '192.168.1.22',
  })

  pickupLogs.push({
    id: uuid(),
    batchId: batch4.id,
    contextKey: batch4CtxKey,
    inputCode: '777777',
    inputPhone: null,
    isSuccess: false,
    failReason: '取件码错误（第3次，手机号上下文累计锁定触发）',
    attemptTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    operatorIp: '192.168.1.22',
  })

  lockRecords.push({
    id: uuid(),
    batchId: batch4.id,
    contextKey: batch4CtxKey,
    lockType: LockType.PICKUP_CODE,
    reason: '连续3次取件码验证失败（手机号上下文累计）',
    lockedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    lockedBy: 'system',
    isUnlocked: false,
    unlockedBy: null,
    unlockedAt: null,
    remark: null,
    autoUnlockAt: new Date(now.getTime() + 10 * 60 * 1000),
  })

  lockRecords.push({
    id: uuid(),
    batchId: batch3.id,
    contextKey: batch3.customerPhone ? `phone:${batch3.customerPhone}` : `batch:${batch3.id}`,
    lockType: LockType.PICKUP_CODE,
    reason: '【回归验证】连续3次取件码错误按手机号上下文累计锁定（已解锁）',
    lockedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
    lockedBy: 'system',
    isUnlocked: true,
    unlockedBy: 'manager_001',
    unlockedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
    remark: '顾客携带身份证原件前来取件，身份已核实，店长人工解锁。【审计留痕】',
    autoUnlockAt: new Date(now.getTime() - 5 * 30 * 60 * 1000),
  })

  pickupLogs.push({
    id: uuid(),
    batchId: batch3.id,
    contextKey: batch3.customerPhone ? `phone:${batch3.customerPhone}` : `batch:${batch3.id}`,
    inputCode: '000111',
    inputPhone: null,
    isSuccess: false,
    failReason: '【回归验证】取件码错误1/3（锁定前）',
    attemptTime: new Date(now.getTime() - 6 * 60 * 60 * 1000 - 5 * 60 * 1000),
    operatorIp: '10.0.0.88',
  })

  pickupLogs.push({
    id: uuid(),
    batchId: batch3.id,
    contextKey: batch3.customerPhone ? `phone:${batch3.customerPhone}` : `batch:${batch3.id}`,
    inputCode: '000222',
    inputPhone: null,
    isSuccess: false,
    failReason: '【回归验证】取件码错误2/3（锁定前）',
    attemptTime: new Date(now.getTime() - 6 * 60 * 60 * 1000 - 3 * 60 * 1000),
    operatorIp: '10.0.0.88',
  })

  pickupLogs.push({
    id: uuid(),
    batchId: batch3.id,
    contextKey: batch3.customerPhone ? `phone:${batch3.customerPhone}` : `batch:${batch3.id}`,
    inputCode: '000333',
    inputPhone: null,
    isSuccess: false,
    failReason: '【回归验证】取件码错误3/3 → 触发锁定',
    attemptTime: new Date(now.getTime() - 6 * 60 * 60 * 1000),
    operatorIp: '10.0.0.88',
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
          rewashFailedCount: 0,
          isPickedUp: false,
          pickedUpAt: null,
          transferId: null,
          notified: false,
          statusHistory: [],
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
              rewashFailedCount: c.rewashFailedCount ?? 0,
              transferId: c.transferId ?? null,
              statusHistory: c.statusHistory ?? [],
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
          rewashFailedCount: 0,
          isPickedUp: false,
          pickedUpAt: null,
          transferId: null,
          notified: false,
          statusHistory: [],
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
                rewashFailedCount: c.rewashFailedCount ?? 0,
                transferId: c.transferId ?? null,
                statusHistory: c.statusHistory ?? [],
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

      updateClothingStatusWithHistory: (clothingId, targetStatus, operator, remark) => {
        const state = get()
        const clothing = state.clothingItems.find((c) => c.id === clothingId)
        if (!clothing) throw new Error('衣物不存在')

        const batch = state.batches.find((b) => b.id === clothing.batchId)
        if (!batch) throw new Error('批次不存在')

        const validation = validateClothStatusTransition(clothing, targetStatus, batch)
        if (!validation.valid) {
          throw new Error(validation.reason || '状态变更不合法')
        }

        const transition = createStatusTransition(
          clothingId,
          clothing.status,
          targetStatus,
          operator,
          remark || '',
        )

        set((state) => {
          const updatedItems = state.clothingItems.map((c) => {
            if (c.id === clothingId) {
              return {
                ...c,
                status: targetStatus,
                isRewashed: targetStatus === ClothingStatus.REWASHING ? true : c.isRewashed,
                rewashCount: targetStatus === ClothingStatus.REWASHING ? c.rewashCount + 1 : c.rewashCount,
                rewashFailedCount:
                  targetStatus === ClothingStatus.REWASH_FAILED
                    ? (c.rewashFailedCount ?? 0) + 1
                    : c.rewashFailedCount ?? 0,
                statusHistory: [...(c.statusHistory ?? []), transition],
              }
            }
            return c
          })

          const batchId = clothing.batchId
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

      completeRewash: (clothingId, operator, result) => {
        const state = get()
        const clothing = state.clothingItems.find((c) => c.id === clothingId)
        if (!clothing) throw new Error('衣物不存在')

        const batch = state.batches.find((b) => b.id === clothing.batchId)
        if (!batch) throw new Error('批次不存在')

        if (!canCompleteRewash(clothing, batch)) {
          throw new Error('当前状态不允许完成返洗')
        }

        set((state) => {
          const updatedRewash = state.rewashRecords.map((r) => {
            if (r.clothingId === clothingId && r.status === RewashStatus.PROCESSING) {
              return { ...r, status: RewashStatus.COMPLETED, result: result || null }
            }
            return r
          })

          return { rewashRecords: updatedRewash }
        })

        get().updateClothingStatusWithHistory(
          clothingId,
          ClothingStatus.PENDING_QC,
          operator,
          result || '返洗完成',
        )
      },

      markRewashFailed: (clothingId, operator, reason) => {
        const state = get()
        const clothing = state.clothingItems.find((c) => c.id === clothingId)
        if (!clothing) throw new Error('衣物不存在')

        const batch = state.batches.find((b) => b.id === clothing.batchId)
        if (!batch) throw new Error('批次不存在')

        if (!canMarkRewashFailed(clothing, batch)) {
          throw new Error('当前状态不允许标记返洗失败')
        }

        if (!reason || reason.trim().length === 0) {
          throw new Error('必须填写返洗失败原因')
        }

        set((state) => {
          const updatedRewash = state.rewashRecords.map((r) => {
            if (r.clothingId === clothingId && r.status === RewashStatus.PROCESSING) {
              return { ...r, status: RewashStatus.FAILED, result: reason }
            }
            return r
          })

          return { rewashRecords: updatedRewash }
        })

        get().updateClothingStatusWithHistory(
          clothingId,
          ClothingStatus.REWASH_FAILED,
          operator,
          reason,
        )
      },

      applyCorrection: (batchId, amount, reason, operator) => {
        const state = get()
        const batch = state.batches.find((b) => b.id === batchId)
        if (!batch) throw new Error('批次不存在')

        const changeType = batch.isDayClosed ? FeeChangeType.DAYCLOSE_ADJUST : FeeChangeType.CORRECTION

        const validation = validateFeeChange(batch, changeType, 'manager')
        if (!validation.valid) {
          throw new Error(validation.reason || '冲正操作不允许')
        }

        if (!validateFeeChangeReason(changeType, reason)) {
          throw new Error('冲正必须填写原因')
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
          createdAt: now,
        }

        set((state) => {
          const currentBatch = state.batches.find((b) => b.id === batchId)
          if (!currentBatch) return { feeChanges: [...state.feeChanges, feeChange] }

          const newFinalAmount = currentBatch.finalAmount + amount

          return {
            feeChanges: [...state.feeChanges, feeChange],
            batches: state.batches.map((b) =>
              b.id === batchId
                ? {
                    ...b,
                    finalAmount: Math.round(newFinalAmount * 100) / 100,
                  }
                : b
            ),
          }
        })

        return feeChange
      },

      authorizePickup: (customerId, authorizedPhone, authorizedName, operator) => {
        set((state) => {
          const updatedCustomers = state.customers.map((c) => {
            if (c.id === customerId) {
              return {
                ...c,
                isAuthorized: true,
                authorizedPhone,
                authorizedName,
                authorizeOperator: operator,
                authorizeTime: new Date(),
              }
            }
            return c
          })

          return { customers: updatedCustomers }
        })
      },

      outsourceClothing: (clothingIds, vendor, operator) => {
        const state = get()

        clothingIds.forEach((clothingId) => {
          const clothing = state.clothingItems.find((c) => c.id === clothingId)
          if (!clothing) throw new Error('衣物不存在')

          const batch = state.batches.find((b) => b.id === clothing.batchId)
          if (!batch) throw new Error('批次不存在')

          if (!canOutsource(clothing, batch)) {
            throw new Error(`衣物 ${clothing.barcode} 当前状态不允许外包`)
          }

          get().updateClothingStatusWithHistory(
            clothingId,
            ClothingStatus.OUTSOURCED,
            operator,
            `外包给: ${vendor}`,
          )

          set((state) => ({
            clothingItems: state.clothingItems.map((c) =>
              c.id === clothingId ? { ...c, outsourcedVendor: vendor } : c
            ),
          }))
        })
      },

      receiveOutsourced: (clothingIds, operator) => {
        clothingIds.forEach((clothingId) => {
          get().updateClothingStatusWithHistory(
            clothingId,
            ClothingStatus.PENDING_QC,
            operator,
            '外包收回，等待质检',
          )
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
          amount: 0,
          reason: data.reason,
          applicant: data.applicant,
          approver: null,
          createdBy: data.applicant,
          status: CompensationStatus.PENDING,
          applyTime: now,
          approveTime: null,
          createdAt: now,
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

      verifyPickupInput: (type, input) => {
        const state = get()

        let matchedBatches: Batch[] = []
        if (type === 'code') {
          matchedBatches = state.batches.filter((b) => b.pickupCode === input)
        } else {
          matchedBatches = state.batches.filter((b) => b.customerPhone === input)
        }

        const isMatchSuccess = matchedBatches.length > 0

        let contextKey: string
        let lockableBatchIds: string[] = []

        if (type === 'phone') {
          contextKey = `${type}:${input}`
          lockableBatchIds = matchedBatches.map((b) => b.id)
          if (lockableBatchIds.length === 0) {
            const samePhoneBatches = state.batches.filter((b) => b.customerPhone === input)
            lockableBatchIds = samePhoneBatches.map((b) => b.id)
          }
        } else {
          if (isMatchSuccess) {
            const matchedBatch = matchedBatches[0]
            contextKey = matchedBatch.customerPhone
              ? `phone:${matchedBatch.customerPhone}`
              : `batch:${matchedBatch.id}`
            lockableBatchIds = matchedBatches.map((b) => b.id)
          } else {
            const prefixCode = input.substring(0, 3)
            const fuzzyBatches = state.batches.filter((b) => {
              if (!b.pickupCode) return false
              if (b.pickupCode === input) return true
              if (b.pickupCode.substring(0, 3) === prefixCode) return true
              return false
            })
            if (fuzzyBatches.length > 0 && fuzzyBatches.length <= 30) {
              const firstBatch = fuzzyBatches[0]
              contextKey = firstBatch.customerPhone
                ? `phone:${firstBatch.customerPhone}`
                : `code:${input.substring(0, 3)}`
              lockableBatchIds = fuzzyBatches.map((b) => b.id)
            } else {
              contextKey = `code:${prefixCode}`
              lockableBatchIds = []
            }
          }
        }

        const isLocked = state.isContextLocked(contextKey)
        if (isLocked) {
          return { success: false, remainingAttempts: 0, isLocked: true, matchedBatches: [], contextKey }
        }

        if (isMatchSuccess) {
          if (type === 'phone') {
            matchedBatches.forEach((b) => {
              state.recordPickupAttempt(contextKey, b.id, input, true)
            })
          } else {
            state.recordPickupAttempt(contextKey, matchedBatches[0].id, input, true)
          }
          return {
            success: true,
            remainingAttempts: MAX_PICKUP_ATTEMPTS,
            isLocked: false,
            matchedBatches,
            contextKey,
          }
        }

        const failReason = type === 'code' ? '取件码错误' : '手机号错误'
        const anyBatchId = lockableBatchIds.length > 0 ? lockableBatchIds[0] : null
        state.recordPickupAttempt(contextKey, anyBatchId, input, false, failReason)

        const failedAttempts = state.getFailedAttemptsByContext(contextKey)
        const remaining = MAX_PICKUP_ATTEMPTS - failedAttempts

        if (remaining <= 0) {
          state.lockByContext(
            contextKey,
            lockableBatchIds,
            LockType.PICKUP_CODE,
            `连续输错${type === 'code' ? '取件码' : '手机号'}超过${MAX_PICKUP_ATTEMPTS}次`
          )
          return { success: false, remainingAttempts: 0, isLocked: true, matchedBatches: [], contextKey }
        }

        return {
          success: false,
          remainingAttempts: Math.max(0, remaining),
          isLocked: false,
          matchedBatches: [],
          contextKey,
        }
      },

      verifyPickupCode: (batchId, code) => {
        const { getBatchById } = get()
        const batch = getBatchById(batchId)

        if (!batch) {
          return { success: false, remainingAttempts: 0, isLocked: false, contextKey: `batch:${batchId}` }
        }

        const contextKey = batch.customerPhone
          ? `phone:${batch.customerPhone}`
          : `batch:${batch.id}`

        const isLocked = get().isContextLocked(contextKey)
        if (isLocked) {
          return { success: false, remainingAttempts: 0, isLocked: true, contextKey }
        }

        const failedAttempts = get().getFailedAttemptsByContext(contextKey)

        if (batch.pickupCode === code) {
          get().recordPickupAttempt(contextKey, batchId, code, true)
          const remaining = Math.max(0, MAX_PICKUP_ATTEMPTS - failedAttempts)
          return { success: true, remainingAttempts: remaining, isLocked: false, contextKey }
        } else {
          get().recordPickupAttempt(contextKey, batchId, code, false, '取件码错误')
          const newFailedAttempts = failedAttempts + 1
          const remaining = MAX_PICKUP_ATTEMPTS - newFailedAttempts

          if (remaining <= 0) {
            get().lockByContext(contextKey, [batchId], LockType.PICKUP_CODE, `连续输错取件码超过${MAX_PICKUP_ATTEMPTS}次`)
            return { success: false, remainingAttempts: 0, isLocked: true, contextKey }
          }

          return { success: false, remainingAttempts: Math.max(0, remaining), isLocked: false, contextKey }
        }
      },

      verifyByPhone: (phone) => {
        const { batches } = get()
        return batches.filter((b) => b.customerPhone === phone)
      },

      lockByContext: (contextKey, batchIds, lockType, reason, operator) => {
        const now = new Date()
        const nowTime = now.getTime()
        const AUTO_UNLOCK_MS = 60 * 60 * 1000

        set((state) => {
          const newLocks: LockRecord[] = []
          if (batchIds.length > 0) {
            batchIds.forEach((bid) => {
              newLocks.push({
                id: uuid(),
                batchId: bid,
                contextKey,
                lockType,
                reason,
                isUnlocked: false,
                lockedBy: operator || null,
                unlockedBy: null,
                remark: null,
                lockedAt: now,
                unlockedAt: null,
                autoUnlockAt: new Date(nowTime + AUTO_UNLOCK_MS),
              })
            })
          } else {
            newLocks.push({
              id: uuid(),
              batchId: null,
              contextKey,
              lockType,
              reason,
              isUnlocked: false,
              lockedBy: operator || null,
              unlockedBy: null,
              remark: null,
              lockedAt: now,
              unlockedAt: null,
              autoUnlockAt: new Date(nowTime + AUTO_UNLOCK_MS),
            })
          }

          const updatedBatches = state.batches.map((b) =>
            batchIds.includes(b.id) ? { ...b, isLocked: true, status: BatchStatus.LOCKED } : b
          )
          return {
            batches: updatedBatches,
            lockRecords: [...state.lockRecords, ...newLocks],
          }
        })
      },

      lockBatch: (batchId, lockType, reason, operator) => {
        get().lockByContext(`batch:${batchId}`, [batchId], lockType, reason, operator)
      },

      unlockByContext: (contextKey, operator, reason) => {
        const now = new Date()

        set((state) => {
          const targetLocks = state.lockRecords.filter(
            (l) => l.contextKey === contextKey && !l.isUnlocked
          )
          const affectedBatchIds = targetLocks
            .map((l) => l.batchId)
            .filter((id): id is string => id !== null)

          const updatedLocks = state.lockRecords.map((l) =>
            l.contextKey === contextKey && !l.isUnlocked
              ? {
                  ...l,
                  isUnlocked: true,
                  unlockedBy: operator,
                  remark: reason,
                  unlockedAt: now,
                }
              : l
          )

          let updatedBatches = state.batches
          if (affectedBatchIds.length > 0) {
            updatedBatches = state.batches.map((b) => {
              if (affectedBatchIds.includes(b.id)) {
                const batchClothing = state.clothingItems.filter((c) => c.batchId === b.id)
                const feeChanges = state.feeChanges.filter((f) => f.batchId === b.id)
                const qcRecords = state.qcRecords.filter((q) => q.batchId === b.id)
                const otherLocksActive = state.lockRecords.some(
                  (l) =>
                    l.batchId === b.id &&
                    l.contextKey !== contextKey &&
                    !l.isUnlocked
                )
                if (!otherLocksActive) {
                  const statusResult = calcBatchStatus(b, batchClothing, [], feeChanges, qcRecords)
                  return { ...b, isLocked: false, status: statusResult.status }
                }
              }
              return b
            })
          }

          return {
            lockRecords: updatedLocks,
            batches: updatedBatches,
          }
        })
      },

      unlockBatch: (batchId, operator, reason) => {
        get().unlockByContext(`batch:${batchId}`, operator, reason)
      },

      recordPickupAttempt: (contextKey, batchId, input, isSuccess, failReason) => {
        const now = new Date()
        const isCode = /^\d{6}$/.test(input)

        const log: PickupLog = {
          id: uuid(),
          batchId,
          contextKey,
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

      getFailedAttemptsByContext: (contextKey) => {
        const FIVE_MIN_AGO = Date.now() - 5 * 60 * 1000
        return get().pickupLogs.filter(
          (l) => l.contextKey === contextKey && !l.isSuccess && l.attemptTime.getTime() >= FIVE_MIN_AGO
        ).length
      },

      isBatchLocked: (batchId) => {
        return get().lockRecords.some((l) => l.batchId === batchId && !l.isUnlocked)
      },

      isContextLocked: (contextKey) => {
        const lock = get()
          .lockRecords.filter((l) => l.contextKey === contextKey && !l.isUnlocked)
          .sort((a, b) => b.lockedAt.getTime() - a.lockedAt.getTime())[0]
        if (!lock) return false
        if (!lock.autoUnlockAt) return true
        return lock.autoUnlockAt.getTime() > Date.now()
      },

      getLockRecordByContext: (contextKey) => {
        const lock = get()
          .lockRecords.filter((l) => l.contextKey === contextKey && !l.isUnlocked)
          .sort((a, b) => b.lockedAt.getTime() - a.lockedAt.getTime())[0]
        return lock || null
      },

      applyFeeChange: (batchId, changeType, amount, reason, operator) => {
        const state = get()
        const batch = state.batches.find((b) => b.id === batchId)
        if (!batch) throw new Error('批次不存在')

        const operatorRole = changeType === FeeChangeType.REDUCTION || changeType === FeeChangeType.CORRECTION
          ? 'manager'
          : 'cashier'

        const validation = validateFeeChange(batch, changeType, operatorRole)
        if (!validation.valid) {
          throw new Error(validation.reason || '费用变更不允许')
        }

        if (!validateFeeChangeReason(changeType, reason)) {
          throw new Error('该费用变更类型必须填写原因')
        }

        const now = new Date()
        const actualChangeType = batch.isDayClosed ? FeeChangeType.DAYCLOSE_ADJUST : changeType

        const feeChange: FeeChange = {
          id: uuid(),
          batchId,
          changeType: actualChangeType,
          amount,
          reason,
          operator,
          operateTime: now,
          createdAt: now,
        }

        set((state) => {
          const currentBatch = state.batches.find((b) => b.id === batchId)
          if (!currentBatch) return { feeChanges: [...state.feeChanges, feeChange] }

          let newDiscountAmount = currentBatch.discountAmount
          let newFinalAmount = currentBatch.finalAmount

          if (amount < 0) {
            newDiscountAmount = currentBatch.discountAmount + Math.abs(amount)
            newFinalAmount = Math.max(0, currentBatch.finalAmount + amount)
          } else {
            newFinalAmount = currentBatch.finalAmount + amount
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
          createdAt: now,
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
            baseAmount: 0,
            discountAmount: 0,
            packageDeduction: 0,
            packageDiscount: 0,
            memberDiscount: 0,
            overdueFee: 0,
            reductionAmount: 0,
            compensationAmount: 0,
            adjustments: [],
            totalAdjust: 0,
            totalPayable: 0,
            finalAmount: 0,
            clothBreakdown: {},
          }
        }

        const clothingItems = state.clothingItems.filter((c) => c.batchId === batchId)
        const feeChanges = state.feeChanges.filter((f) => f.batchId === batchId)
        const compensations = state.compensations.filter((c) => c.batchId === batchId)

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
            compensations,
            member,
            pricePackage
          )
        }

        return calcBatchFee(batch, clothingItems, feeChanges, compensations, member, pricePackage)
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
