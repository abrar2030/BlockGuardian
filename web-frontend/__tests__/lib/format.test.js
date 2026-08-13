import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatLabel,
  formatTokenAmount,
  initials,
} from "../../lib/format";

describe("formatCurrency", () => {
  it("formats a standard USD amount", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
  });

  it("returns a placeholder dash for invalid input", () => {
    expect(formatCurrency("not-a-number")).toBe("-");
  });

  it("shows extra precision for sub-dollar values", () => {
    expect(formatCurrency(0.1234)).toBe("$0.1234");
  });
});

describe("formatNumber", () => {
  it("adds thousands separators", () => {
    expect(formatNumber(1234567.891, 2)).toBe("1,234,567.89");
  });
});

describe("formatPercent", () => {
  it("prefixes positive values with a plus sign", () => {
    expect(formatPercent(5.5)).toBe("+5.50%");
  });

  it("keeps the minus sign for negative values", () => {
    expect(formatPercent(-3.25)).toBe("-3.25%");
  });
});

describe("formatLabel", () => {
  it("converts snake_case to Title Case", () => {
    expect(formatLabel("very_high")).toBe("Very High");
  });

  it("returns a placeholder dash for empty input", () => {
    expect(formatLabel("")).toBe("-");
  });
});

describe("initials", () => {
  it("builds initials from first and last name", () => {
    expect(initials("Jane", "Doe")).toBe("JD");
  });

  it("falls back to U when no name is given", () => {
    expect(initials("", "")).toBe("U");
  });
});

describe("formatTokenAmount", () => {
  it("converts an 18-decimal wei-style integer string to a token amount", () => {
    // 1,000,000 tokens at 18 decimals
    expect(formatTokenAmount("1000000000000000000000000")).toBe("1,000,000.00");
  });

  it("handles amounts smaller than one whole token", () => {
    // 0.5 tokens at 18 decimals
    expect(formatTokenAmount("500000000000000000")).toBe("0.50");
  });

  it("handles zero", () => {
    expect(formatTokenAmount("0")).toBe("0.00");
  });

  it("returns a placeholder dash for null/undefined", () => {
    expect(formatTokenAmount(null)).toBe("-");
    expect(formatTokenAmount(undefined)).toBe("-");
  });

  it("returns a placeholder dash for non-numeric strings", () => {
    expect(formatTokenAmount("not-a-number")).toBe("-");
  });

  it("supports a custom decimals count", () => {
    // USDC-style 6 decimals: 1,000,000 = 1.0
    expect(formatTokenAmount("1000000", 6)).toBe("1.00");
  });
});
