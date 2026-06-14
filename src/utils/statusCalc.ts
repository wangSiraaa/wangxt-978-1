import type { Batch, ClothingItem, QcRecord, LockRecord, FeeChange, ClothingStatusTransition } from '../types'
import { ClothingStatus, ClothingQcStatus, BatchStatus, RewashStatus } from '../types'
import { isOverdue, getOverdueDays } from './dateUtil'

export interface BatchStatusResult {
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
  qcPassedCount: number
  qcFailedCount: number
  qcExceptionCount: number
  pendingQcCount: number
  rewashingCount: number
  rewashFailedCount: number
  outsourcedCount: number
  transferredCount: number
  canRevert: boolean
  isDayClosed: boolean
}

export interface ClothStatusValidationResult {
  valid: boolean
  reason?: string
  allowedTransitions: ClothingStatus[]
}

export interface StatusTransitionLog {
  clothingId: string
  from: ClothingStatus
  to: ClothingStatus
  operator: string
  reason?: string
  timestamp: Date
}

const STATUS_TRANSITION_MAP: Record<ClothingStatus, ClothingStatus[]> = {
  [ClothingStatus.PENDING_WASH]: [
    ClothingStatus.WASHING,
    ClothingStatus.OUTSOURCED,
    ClothingStatus.TRANSFERRED,
  ],
  [ClothingStatus.WASHING]: [
    ClothingStatus.PENDING_QC,
    ClothingStatus.REWASHING,
  ],
  [ClothingStatus.PENDING_QC]: [
    ClothingStatus.QC_PASSED,
    ClothingStatus.QC_FAILED,
    ClothingStatus.QC_EXCEPTION,
    ClothingStatus.QC_ABNORMAL,
  ],
  [ClothingStatus.QC_PASSED]: [
    ClothingStatus.READY,
    ClothingStatus.REWASHING,
  ],
  [ClothingStatus.QC_FAILED]: [
    ClothingStatus.REWASHING,
    ClothingStatus.READY,
  ],
  [ClothingStatus.QC_EXCEPTION]: [
    ClothingStatus.REWASHING,
    ClothingStatus.READY,
  ],
  [ClothingStatus.QC_ABNORMAL]: [
    ClothingStatus.REWASHING,
    ClothingStatus.READY,
  ],
  [ClothingStatus.REWASHING]: [
    ClothingStatus.PENDING_QC,
    ClothingStatus.REWASH_FAILED,
  ],
  [ClothingStatus.REWASH_FAILED]: [
    ClothingStatus.REWASHING,
    ClothingStatus.READY,
  ],
  [ClothingStatus.READY]: [
    ClothingStatus.PICKED_UP,
    ClothingStatus.REWASHING,
    ClothingStatus.TRANSFERRED,
  ],
  [ClothingStatus.PICKED_UP]: [],
  [ClothingStatus.TRANSFERRED]: [
    ClothingStatus.READY,
  ],
  [ClothingStatus.OUTSOURCED]: [
    ClothingStatus.OUTSOURCED_RETURNED,
  ],
  [ClothingStatus.OUTSOURCED_RETURNED]: [
    ClothingStatus.PENDING_QC,
  ],
}

export function validateClothStatusTransition(
  clothing: ClothingItem,
  targetStatus: ClothingStatus,
  batch: Batch,
): ClothStatusValidationResult {
  if (clothing.status === ClothingStatus.PICKED_UP) {
    return {
      valid: false,
      reason: '已取走的衣物不能修改状态',
      allowedTransitions: [],
    }
  }

  if (batch.isDayClosed) {
    return {
      valid: false,
      reason: '已日结的批次不能修改衣物状态',
      allowedTransitions: [],
    }
  }

  if (batch.isLocked) {
    return {
      valid: false,
      reason: '批次已锁定，不能修改衣物状态',
      allowedTransitions: [],
    }
  }

  const allowedTransitions = STATUS_TRANSITION_MAP[clothing.status] || []
  const valid = allowedTransitions.includes(targetStatus)

  return {
    valid,
    reason: valid ? undefined : `状态流转不允许: ${clothing.status} → ${targetStatus}`,
    allowedTransitions,
  }
}

export function canRevertClothStatus(
  clothing: ClothingItem,
  batch: Batch,
): boolean {
  if (clothing.isPickedUp) {
    return false
  }
  if (batch.isDayClosed) {
    return false
  }
  if (batch.isLocked) {
    return false
  }
  return true
}

export function createStatusTransition(
  clothingId: string,
  fromStatus: ClothingStatus,
  toStatus: ClothingStatus,
  operator: string,
  reason?: string,
): ClothingStatusTransition {
  return {
    clothingId,
    fromStatus,
    toStatus,
    operator,
    reason,
    timestamp: new Date(),
  }
}

export function getClothStatusRiskLevel(clothing: ClothingItem): 'normal' | 'warning' | 'danger' {
  if (clothing.status === ClothingStatus.REWASH_FAILED) return 'danger'
  if (clothing.rewashFailedCount >= 2) return 'danger'
  if (clothing.rewashCount >= 2) return 'warning'
  if (clothing.colorRisk && clothing.colorRisk !== '无') return 'warning'
  if (clothing.isValuable) return 'warning'
  return 'normal'
}

function isClothReadyForPickup(clothing: ClothingItem): boolean {
  return (
    clothing.status === ClothingStatus.READY ||
    clothing.status === ClothingStatus.QC_PASSED
  )
}

function hasQcException(clothing: ClothingItem): boolean {
  return (
    clothing.status === ClothingStatus.QC_FAILED ||
    clothing.status === ClothingStatus.QC_EXCEPTION ||
    clothing.status === ClothingStatus.QC_ABNORMAL ||
    clothing.status === ClothingStatus.REWASH_FAILED
  )
}

function isInQc(clothing: ClothingItem): boolean {
  return clothing.status === ClothingStatus.PENDING_QC
}

function isInWash(clothing: ClothingItem): boolean {
  return (
    clothing.status === ClothingStatus.PENDING_WASH ||
    clothing.status === ClothingStatus.WASHING ||
    clothing.status === ClothingStatus.REWASHING ||
    clothing.status === ClothingStatus.OUTSOURCED
  )
}

export function isRewashFailed(clothing: ClothingItem): boolean {
  return clothing.status === ClothingStatus.REWASH_FAILED
}

function isOutsourced(clothing: ClothingItem): boolean {
  return (
    clothing.status === ClothingStatus.OUTSOURCED ||
    clothing.status === ClothingStatus.OUTSOURCED_RETURNED
  )
}

export function calcBatchStatus(
  batch: Batch,
  clothingItems: ClothingItem[],
  lockRecords: LockRecord[] = [],
  feeChanges: FeeChange[] = [],
  qcRecords: QcRecord[] = [],
  now: Date = new Date()
): BatchStatusResult {
  const totalClothCount = clothingItems.length
  const pickedClothCount = clothingItems.filter((c) => c.isPickedUp).length
  const allPicked = pickedClothCount === totalClothCount && totalClothCount > 0

  const unpickedItems = clothingItems.filter((c) => !c.isPickedUp)
  const readyClothCount = unpickedItems.filter((c) => isClothReadyForPickup(c)).length
  const hasException = unpickedItems.some((c) => hasQcException(c))
  const hasRewash = unpickedItems.some((c) => c.status === ClothingStatus.REWASHING)
  const hasRewashFailed = unpickedItems.some((c) => isRewashFailed(c))
  const inQcCount = unpickedItems.filter((c) => isInQc(c)).length
  const inWashCount = unpickedItems.filter((c) => isInWash(c)).length
  const rewashingCount = unpickedItems.filter((c) => c.status === ClothingStatus.REWASHING).length
  const rewashFailedCount = unpickedItems.filter((c) => isRewashFailed(c)).length
  const outsourcedCount = clothingItems.filter((c) => isOutsourced(c)).length
  const transferredCount = clothingItems.filter((c) => c.status === ClothingStatus.TRANSFERRED).length

  const qcPassedCount = clothingItems.filter(
    (c) => c.qcStatus === ClothingQcStatus.PASSED
  ).length
  const qcFailedCount = clothingItems.filter(
    (c) => c.qcStatus === ClothingQcStatus.FAILED
  ).length
  const qcExceptionCount = clothingItems.filter(
    (c) => c.qcStatus === ClothingQcStatus.EXCEPTION
  ).length
  const pendingQcCount = clothingItems.filter(
    (c) => c.qcStatus === ClothingQcStatus.NOT_INSPECTED
  ).length

  const activeLocks = lockRecords.filter((l) => l.batchId === batch.id && !l.isUnlocked)
  const isLocked = activeLocks.length > 0

  const overdue = isOverdue(batch.expectedTime, now)
  const overdueDays = getOverdueDays(batch.expectedTime, now)

  let status: BatchStatus

  if (allPicked) {
    status = BatchStatus.COMPLETED
  } else if (isLocked) {
    status = BatchStatus.LOCKED
  } else if (hasException || hasRewash || hasRewashFailed) {
    status = BatchStatus.QC_FAILED
  } else if (pickedClothCount > 0 && readyClothCount > 0) {
    status = BatchStatus.PARTIAL_PICKED
  } else if (readyClothCount > 0 && readyClothCount === unpickedItems.length) {
    status = BatchStatus.READY
  } else if (readyClothCount > 0) {
    status = BatchStatus.QC_PARTIAL
  } else if (inQcCount > 0) {
    status = BatchStatus.PENDING_QC
  } else if (inWashCount > 0) {
    status = BatchStatus.PENDING_QC
  } else {
    status = BatchStatus.PENDING_QC
  }

  if (overdue && status === BatchStatus.READY) {
    status = BatchStatus.OVERDUE
  }

  const canNotifyPickup =
    !isLocked &&
    !allPicked &&
    readyClothCount > 0 &&
    !hasException &&
    !hasRewash &&
    !hasRewashFailed &&
    pendingQcCount === 0

  const canPartialPickup =
    !isLocked &&
    !allPicked &&
    readyClothCount > 0 &&
    readyClothCount < unpickedItems.length &&
    !hasException &&
    !hasRewashFailed

  const needsManagerAttention =
    isLocked ||
    hasException ||
    hasRewash ||
    hasRewashFailed ||
    (overdue && overdueDays >= 7) ||
    qcFailedCount > 0 ||
    rewashFailedCount > 0

  const canRevert = !allPicked && !batch.isDayClosed

  return {
    status,
    canNotifyPickup,
    canPartialPickup,
    isOverdue: overdue,
    overdueDays,
    readyClothCount,
    totalClothCount,
    pickedClothCount,
    hasException,
    isLocked,
    needsManagerAttention,
    qcPassedCount,
    qcFailedCount,
    qcExceptionCount,
    pendingQcCount,
    rewashingCount,
    rewashFailedCount,
    outsourcedCount,
    transferredCount,
    canRevert,
    isDayClosed: batch.isDayClosed,
  }
}

export function canRevertStatus(
  batch: Batch,
  clothingItems: ClothingItem[],
  lockRecords: LockRecord[] = []
): boolean {
  const result = calcBatchStatus(batch, clothingItems, lockRecords)
  if (result.status === BatchStatus.COMPLETED) {
    return false
  }
  if (batch.isDayClosed) {
    return false
  }
  const hasPickedUp = clothingItems.some((c) => c.isPickedUp)
  if (hasPickedUp) {
    return false
  }
  return true
}

export const canRevertBatch = canRevertStatus

export function canCompleteRewash(
  clothing: ClothingItem,
  batch: Batch,
): boolean {
  return (
    clothing.status === ClothingStatus.REWASHING &&
    !batch.isDayClosed &&
    !batch.isLocked &&
    !clothing.isPickedUp
  )
}

export function canMarkRewashFailed(
  clothing: ClothingItem,
  batch: Batch,
): boolean {
  return (
    clothing.status === ClothingStatus.REWASHING &&
    !batch.isDayClosed &&
    !batch.isLocked &&
    !clothing.isPickedUp
  )
}

export function canApplyCompensation(
  clothing: ClothingItem,
  batch: Batch,
): boolean {
  return (
    !clothing.isPickedUp &&
    !batch.isDayClosed &&
    (hasQcException(clothing) || isRewashFailed(clothing))
  )
}

export function canOutsource(
  clothing: ClothingItem,
  batch: Batch,
): boolean {
  return (
    clothing.status === ClothingStatus.PENDING_WASH &&
    !batch.isDayClosed &&
    !batch.isLocked &&
    !clothing.isPickedUp
  )
}

export function canTransfer(
  clothing: ClothingItem,
  batch: Batch,
): boolean {
  return (
    (clothing.status === ClothingStatus.PENDING_WASH ||
      clothing.status === ClothingStatus.READY) &&
    !batch.isDayClosed &&
    !batch.isLocked &&
    !clothing.isPickedUp
  )
}

export function canNotifyBatchPickup(
  batch: Batch,
  clothingItems: ClothingItem[],
  lockRecords: LockRecord[] = []
): boolean {
  const result = calcBatchStatus(batch, clothingItems, lockRecords)
  return result.canNotifyPickup
}

export function canCompleteBatch(
  batch: Batch,
  clothingItems: ClothingItem[],
  lockRecords: LockRecord[] = []
): boolean {
  const result = calcBatchStatus(batch, clothingItems, lockRecords)
  return (
    result.status === BatchStatus.READY ||
    result.status === BatchStatus.OVERDUE ||
    result.status === BatchStatus.PARTIAL_PICKED
  )
}

export function getStatusLabel(status: BatchStatus): string {
  const labels: Record<BatchStatus, string> = {
    [BatchStatus.PENDING_QC]: '待质检',
    [BatchStatus.QC_PARTIAL]: '部分质检',
    [BatchStatus.QC_FAILED]: '质检异常',
    [BatchStatus.READY]: '待取件',
    [BatchStatus.OVERDUE]: '已超期',
    [BatchStatus.PARTIAL_PICKED]: '部分取件',
    [BatchStatus.COMPLETED]: '已完成',
    [BatchStatus.LOCKED]: '已锁定',
  }
  return labels[status] || status
}

export function getStatusColor(status: BatchStatus): string {
  const colors: Record<BatchStatus, string> = {
    [BatchStatus.PENDING_QC]: '#64748B',
    [BatchStatus.QC_PARTIAL]: '#8B5CF6',
    [BatchStatus.QC_FAILED]: '#EF4444',
    [BatchStatus.READY]: '#10B981',
    [BatchStatus.OVERDUE]: '#F59E0B',
    [BatchStatus.PARTIAL_PICKED]: '#0EA5E9',
    [BatchStatus.COMPLETED]: '#0F172A',
    [BatchStatus.LOCKED]: '#DC2626',
  }
  return colors[status] || '#64748B'
}

export function getClothingStatusLabel(status: ClothingStatus): string {
  const labels: Record<ClothingStatus, string> = {
    [ClothingStatus.PENDING_WASH]: '待洗护',
    [ClothingStatus.WASHING]: '洗护中',
    [ClothingStatus.PENDING_QC]: '待质检',
    [ClothingStatus.QC_PASSED]: '质检通过',
    [ClothingStatus.QC_FAILED]: '质检失败',
    [ClothingStatus.QC_EXCEPTION]: '质检异常',
    [ClothingStatus.QC_ABNORMAL]: '质检异常',
    [ClothingStatus.REWASHING]: '返洗中',
    [ClothingStatus.REWASH_FAILED]: '返洗失败',
    [ClothingStatus.READY]: '待取件',
    [ClothingStatus.PICKED_UP]: '已取走',
    [ClothingStatus.TRANSFERRED]: '已调拨',
    [ClothingStatus.OUTSOURCED]: '外包中',
    [ClothingStatus.OUTSOURCED_RETURNED]: '外包收回',
  }
  return labels[status] || status
}

export function getClothingStatusColor(status: ClothingStatus): string {
  const colors: Record<ClothingStatus, string> = {
    [ClothingStatus.PENDING_WASH]: '#64748B',
    [ClothingStatus.WASHING]: '#0EA5E9',
    [ClothingStatus.PENDING_QC]: '#8B5CF6',
    [ClothingStatus.QC_PASSED]: '#10B981',
    [ClothingStatus.QC_FAILED]: '#EF4444',
    [ClothingStatus.QC_EXCEPTION]: '#F59E0B',
    [ClothingStatus.QC_ABNORMAL]: '#F59E0B',
    [ClothingStatus.REWASHING]: '#0EA5E9',
    [ClothingStatus.REWASH_FAILED]: '#DC2626',
    [ClothingStatus.READY]: '#10B981',
    [ClothingStatus.PICKED_UP]: '#0F172A',
    [ClothingStatus.TRANSFERRED]: '#8B5CF6',
    [ClothingStatus.OUTSOURCED]: '#F59E0B',
    [ClothingStatus.OUTSOURCED_RETURNED]: '#8B5CF6',
  }
  return colors[status] || '#64748B'
}

export function getRewashStatusLabel(status: RewashStatus): string {
  const labels: Record<RewashStatus, string> = {
    [RewashStatus.PENDING]: '待返洗',
    [RewashStatus.PROCESSING]: '返洗中',
    [RewashStatus.COMPLETED]: '返洗完成',
    [RewashStatus.FAILED]: '返洗失败',
    [RewashStatus.CANCELLED]: '已取消',
  }
  return labels[status] || status
}

export function getFeeChangeTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    discount: '会员折扣',
    reduction: '费用减免',
    overdue: '超期保管费',
    adjust: '费用调整',
    compensation: '赔付金额',
    correction: '费用冲正',
    dayclose_adjust: '日结调整',
  }
  return labels[type] || type
}

export function getQcStatusLabel(status: ClothingQcStatus): string {
  const labels: Record<ClothingQcStatus, string> = {
    [ClothingQcStatus.NOT_INSPECTED]: '未质检',
    [ClothingQcStatus.PASSED]: '通过',
    [ClothingQcStatus.FAILED]: '失败',
    [ClothingQcStatus.EXCEPTION]: '异常',
  }
  return labels[status] || status
}
