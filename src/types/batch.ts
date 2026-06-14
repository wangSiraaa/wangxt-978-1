import { BatchStatus, ClothingStatus, ClothingQcStatus, MemberLevel, PricePackageType, ClothingStatusTransition } from './fee'

export interface Store {
  id: string
  name: string
  address: string
}

export interface PricePackage {
  id: string
  name: string
  type: PricePackageType
  value: number
  price: number
  washProjects: string[]
}

export interface Member {
  id: string
  level: MemberLevel
  discountRate: number
  points: number
  packageId: string | null
}

export interface Customer {
  id: string
  name: string
  phone: string
  memberId: string | null
  isAuthorized: boolean
  authorizedPhone: string | null
  authorizeExpire: Date | null
}

export interface ClothingItem {
  id: string
  batchId: string
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
  rewashFailedCount: number
  isPickedUp: boolean
  pickedUpAt: Date | null
  transferId: string | null
  notified?: boolean
  statusHistory: ClothingStatusTransition[]
}

export interface Batch {
  id: string
  batchNo: string
  customerId: string
  customerName: string
  customerPhone: string
  phone?: string
  pickupCode: string
  status: BatchStatus
  createdAt: Date
  expectedTime: Date
  actualPickupTime: Date | null
  storeId: string
  createdBy: string
  totalBaseFee: number
  totalOverdueFee: number
  discountAmount: number
  finalAmount: number
  totalFee?: number
  isLocked: boolean
  isDayClosed: boolean
  clothingItems?: ClothingItem[]
}
