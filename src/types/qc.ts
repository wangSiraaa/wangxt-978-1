import { QcResult, RewashStatus, CompensationStatus } from './fee'

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
  reason: string
  applicant: string
  approver: string | null
  status: CompensationStatus
  applyTime: Date
  approveTime: Date | null
}
