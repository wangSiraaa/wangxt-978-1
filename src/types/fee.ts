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
  READY = 'READY',
  PICKED_UP = 'PICKED_UP',
  TRANSFERRED = 'TRANSFERRED',
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
}

export enum RewashStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
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
}
