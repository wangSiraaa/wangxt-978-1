export enum BatchStatus {
  PENDING_QC = 'PENDING_QC',
  QC_PARTIAL = 'QC_PARTIAL',
  QC_FAILED = 'QC_FAILED',
  READY = 'READY',
  OVERDUE = 'OVERDUE',
  PARTIAL_PICKED = 'PARTIAL_PICKED',
  COMPLETED = 'COMPLETED',
  LOCKED = 'LOCKED',
}

export const WASH_ITEMS: Record<string, { name: string; price: number }> = {
  water_wash: { name: '水洗', price: 20 },
  dry_clean: { name: '干洗', price: 45 },
  iron: { name: '熨烫', price: 15 },
  leather: { name: '皮具护理', price: 120 },
  special: { name: '特殊处理', price: 60 },
}

export const MEMBER_DISCOUNTS: Record<string, number> = {
  normal: 1,
  silver: 0.92,
  gold: 0.85,
  diamond: 0.75,
}

export const OVERDUE_RULES = {
  freeDays: 3,
  stage1Days: 4,
  stage1Rate: 3,
  stage2Rate: 5,
}

export const MAX_PICKUP_ATTEMPTS = 3
export const PICKUP_LOCK_DURATION_MINUTES = 30

export interface FeeAdjustment {
  id: string
  batchId: string
  type: 'waiver' | 'correction' | 'overdue' | 'discount'
  amount: number
  reason: string
  operatorId: string
  operatorName: string
  createdAt: Date
  relatedClothIds?: string[]
}

export interface ClothStatusResult {
  status: BatchStatus
  canNotifyPickup: boolean
  canPartialPickup: boolean
  isOverdue: boolean
  overdueDays: number
  readyClothCount: number
  totalClothCount: number
  pickedClothCount: number
  hasException: boolean
  isLocked: boolean
  needsManagerAttention: boolean
}

export type ClothStatus = string

export enum ClothingStatus {
  PENDING_WASH = 'PENDING_WASH',
  WASHING = 'WASHING',
  PENDING_QC = 'PENDING_QC',
  QC_PASSED = 'QC_PASSED',
  QC_FAILED = 'QC_FAILED',
  QC_EXCEPTION = 'QC_EXCEPTION',
  QC_ABNORMAL = 'QC_ABNORMAL',
  REWASHING = 'REWASHING',
  REWASH_FAILED = 'REWASH_FAILED',
  READY = 'READY',
  PICKED_UP = 'PICKED_UP',
  TRANSFERRED = 'TRANSFERRED',
  OUTSOURCED = 'OUTSOURCED',
  OUTSOURCED_RETURNED = 'OUTSOURCED_RETURNED',
}

export enum ClothingQcStatus {
  NOT_INSPECTED = 'NOT_INSPECTED',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  EXCEPTION = 'EXCEPTION',
}

export enum QcResult {
  PASS = 'pass',
  FAIL = 'fail',
  EXCEPTION = 'exception',
}

export enum LockType {
  PICKUP_CODE = 'pickup_code',
  EXCEPTION = 'EXCEPTION',
  SYSTEM = 'system',
  MANUAL = 'manual',
  OTHER = 'OTHER',
}

export enum FeeChangeType {
  DISCOUNT = 'discount',
  REDUCTION = 'reduction',
  OVERDUE = 'overdue',
  ADJUST = 'adjust',
  COMPENSATION = 'compensation',
  CORRECTION = 'correction',
  DAYCLOSE_ADJUST = 'dayclose_adjust',
}

export enum RewashStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface ClothingStatusTransition {
  clothingId?: string
  fromStatus: ClothingStatus
  toStatus: ClothingStatus
  operator: string
  reason?: string
  remark?: string
  timestamp: Date
}

export interface ClothingStatusHistory {
  clothingId: string
  transitions: ClothingStatusTransition[]
}

export interface ClothLevelDetail {
  id: string
  barcode: string
  clothingType: string
  color: string
  colorRisk: string
  valuation: number
  isValuable: boolean
  washProject: string
  basePrice: number
  status: ClothingStatus
  qcStatus: ClothingQcStatus
  isOutsourced: boolean
  outsourcedVendor: string | null
  isRewashed: boolean
  rewashCount: number
  isPickedUp: boolean
  pickedUpAt: Date | null
  statusHistory: ClothingStatusTransition[]
  qcRecords: QcRecord[]
  rewashRecords: RewashRecord[]
  compensationRecords: Compensation[]
  transferRecords: Transfer[]
}

export enum CompensationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
}

export enum TransferStatus {
  PENDING = 'PENDING',
  IN_TRANSIT = 'IN_TRANSIT',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

export enum PricePackageType {
  COUNT = '次数',
  AMOUNT = '金额',
  TIME = '时间',
}

export enum MemberLevel {
  NORMAL = 'normal',
  SILVER = 'silver',
  GOLD = 'gold',
  DIAMOND = 'diamond',
}

export interface FeeChange {
  id: string
  batchId: string
  changeType: FeeChangeType
  amount: number
  reason: string
  operator: string
  operateTime: Date
  createdAt: Date
}

export interface QcRecord {
  id: string
  batchId: string
  clothingId: string
  result: QcResult
  description: string | null
  photos: string[]
  inspector: string
  inspectTime: Date
  suggestion: string | null
}

export interface RewashRecord {
  id: string
  batchId: string
  clothingId: string
  reason: string
  operator: string
  newBatchId: string | null
  createdAt: Date
  status: RewashStatus
}

export interface Compensation {
  id: string
  batchId: string
  clothingId: string
  applyAmount: number
  approveAmount: number
  amount: number
  reason: string
  applicant: string
  approver: string | null
  createdBy: string
  status: CompensationStatus
  applyTime: Date
  approveTime: Date | null
  createdAt: Date
}

export interface Transfer {
  id: string
  fromStoreId: string
  toStoreId: string
  clothingIds: string[]
  operator: string
  status: TransferStatus
  createdAt: Date
  receivedAt: Date | null
}
