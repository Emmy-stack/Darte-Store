export function normalizePercentageSplitValue(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 99;
  }
  if (value > 0 && value < 1) {
    return value * 100;
  }
  return value;
}

export function getFlutterwaveSplitValue(splitType, splitValue) {
  if (splitType === "percentage") {
    const normalizedValue = normalizePercentageSplitValue(splitValue);
    return normalizedValue / 100;
  }
  return splitValue;
}

export function getSellerShareAmount(splitType, splitValue, totalAmount) {
  if (splitType === "percentage") {
    const normalizedValue = normalizePercentageSplitValue(splitValue);
    return Math.round(totalAmount * normalizedValue) / 100;
  }

  return Math.min(totalAmount, splitValue);
}
