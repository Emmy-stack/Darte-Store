export function normalizePercentageSplitValue(value) {
  if (typeof value !== "number") {
    return 0.98;
  }

  if (value > 1) {
    return value / 100;
  }

  return value;
}

export function getFlutterwaveSplitValue(splitType, splitValue) {
  if (splitType === "percentage") {
    return normalizePercentageSplitValue(splitValue);
  }

  return splitValue;
}

export function getSellerShareAmount(splitType, splitValue, totalAmount) {
  if (splitType === "percentage") {
    const normalized = normalizePercentageSplitValue(splitValue);
    return Math.round(totalAmount * normalized * 100) / 100;
  }

  // For flat payout values, seller receives total minus the flat fee amount.
  return Math.round((totalAmount - splitValue) * 100) / 100;
}
