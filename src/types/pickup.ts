import { LockType, TransferStatus } from './fee'

export interface PickupLog {
  id: string
  batchId: string
  inputCode: string | null
  inputPhone: string | null
  isSuccess: boolean
  failReason: string | null
  attemptTime: Date
  operatorIp: string
}

export interface LockRecord {
  id: string
  batchId: string
  lockType: LockType
  reason: string
  isUnlocked: boolean
  lockedBy: string | null
  unlockedBy: string | null
  remark: string | null
  lockedAt: Date
  unlockedAt: Date | null
  autoUnlockAt: Date | null
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
