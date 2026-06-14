import { LockType, TransferStatus } from './fee'
import type { Transfer } from './fee'

export { LockType, TransferStatus }
export type { Transfer }

export interface PickupLog {
  id: string
  batchId: string | null
  contextKey: string
  inputCode: string | null
  inputPhone: string | null
  isSuccess: boolean
  failReason: string | null
  attemptTime: Date
  operatorIp: string
}

export interface LockRecord {
  id: string
  batchId: string | null
  contextKey: string
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
