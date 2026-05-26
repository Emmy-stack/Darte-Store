export function normalizePercentageSplitValue(value) {
  return 2;
}

export function getFlutterwaveSplitValue(splitType, splitValue) {
  return 0.02;
}

export function getSellerShareAmount(splitType, splitValue, totalAmount) {
  // Enforce exactly 98% of totalAmount (seller share)
  return Math.round(totalAmount * 98) / 100;
}
