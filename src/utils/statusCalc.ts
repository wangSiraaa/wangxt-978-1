import type { Batch, ClothingItem, QcRecord, LockRecord, FeeChange } from '../types'
import { ClothingStatus, ClothingQcStatus, BatchStatus } from '../types'
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
    clothing.status === ClothingStatus.QC_ABNORMAL
  )
}

function isInQc(clothing: ClothingItem): boolean {
  return clothing.status === ClothingStatus.PENDING_QC
}

function isInWash(clothing: ClothingItem): boolean {
  return (
    clothing.status === ClothingStatus.PENDING_WASH ||
    clothing.status === ClothingStatus.WASHING ||
    clothing.status === ClothingStatus.REWASHING
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
  const inQcCount = unpickedItems.filter((c) => isInQc(c)).length
  const inWashCount = unpickedItems.filter((c) => isInWash(c)).length

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
  } else if (hasException || hasRewash) {
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
    pendingQcCount === 0

  const canPartialPickup =
    !isLocked &&
    !allPicked &&
    readyClothCount > 0 &&
    readyClothCount < unpickedItems.length &&
    !hasException

  const needsManagerAttention =
    isLocked ||
    hasException ||
    hasRewash ||
    (overdue && overdueDays >= 7) ||
    qcFailedCount > 0

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
  }
}

export function canRevertStatus(
  batch: Batch,
  clothingItems: ClothingItem[],
  lockRecords: LockRecord[] = []
): boolean {
  const result = calcBatchStatus(batch, clothingItems, lockRecords)
  return result.status !== BatchStatus.COMPLETED
}

export const canRevertBatch = canRevertStatus

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
    [ClothingStatus.READY]: '待取件',
    [ClothingStatus.PICKED_UP]: '已取走',
    [ClothingStatus.TRANSFERRED]: '已调拨',
  }
  return labels[status] || status
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
