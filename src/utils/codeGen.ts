const PICKUP_CODE_CHARS = '0123456789'

export function generatePickupCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += PICKUP_CODE_CHARS.charAt(Math.floor(Math.random() * PICKUP_CODE_CHARS.length))
  }
  return code
}

export function generateClothBarcode(batchNo: string, index: number): string {
  const batchPart = batchNo.slice(-6).padStart(6, '0')
  const indexPart = String(index).padStart(3, '0')
  const checkDigit = (parseInt(batchPart) + index) % 10
  return `C${batchPart}${indexPart}${checkDigit}`
}

export function generateBatchSerial(storeId: string, date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const storePart = storeId.slice(-3).padStart(3, '0')
  const random = String(Math.floor(Math.random() * 9000) + 1000)
  const timestamp = String(date.getTime()).slice(-4)
  return `${year}${month}${day}${storePart}${random}${timestamp}`
}

export function validatePickupCode(code: string): boolean {
  return /^\d{6}$/.test(code)
}

export function validateClothBarcode(barcode: string): boolean {
  if (!/^C\d{10}$/.test(barcode)) return false
  const batchPart = barcode.slice(1, 7)
  const indexPart = barcode.slice(7, 10)
  const checkDigit = parseInt(barcode.slice(10, 11))
  const expected = (parseInt(batchPart) + parseInt(indexPart)) % 10
  return checkDigit === expected
}
