export default function formatPrice(value) {
  if (value === null || value === undefined) return '0'
  const num = Number(value)
  if (Number.isNaN(num)) return String(value)

  // If integer, show without decimals, else show two decimals
  if (Number.isInteger(num)) return num.toLocaleString()
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
