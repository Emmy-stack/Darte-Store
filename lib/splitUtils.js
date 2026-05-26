export function normalizePercentageSplitValue(value) {
  return 99;
}

export function getFlutterwaveSplitValue(splitType, splitValue) {
  return 0.99;
}

export function getSellerShareAmount(splitType, splitValue, totalAmount) {
  // Enforce exactly 99% of totalAmount (seller share)
  return Math.round(totalAmount * 99) / 100;
}
