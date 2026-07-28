import {
  validateEmail,
  validateUsername,
  validatePassword,
  validateRequired,
  validatePositiveNumber,
  passwordStrength,
} from "../../lib/validators";

describe("validateEmail", () => {
  it("rejects empty email", () => {
    expect(validateEmail("")).toMatch(/required/i);
  });

  it("rejects malformed email", () => {
    expect(validateEmail("not-an-email")).toMatch(/valid/i);
  });

  it("accepts a well-formed email", () => {
    expect(validateEmail("jane@example.com")).toBeNull();
  });
});

describe("validateUsername", () => {
  it("rejects usernames shorter than 3 characters", () => {
    expect(validateUsername("ab")).not.toBeNull();
  });

  it("rejects usernames with invalid characters", () => {
    expect(validateUsername("jane doe!")).not.toBeNull();
  });

  it("accepts valid usernames", () => {
    expect(validateUsername("jane_doe-1")).toBeNull();
  });
});

describe("validatePassword", () => {
  it("rejects passwords missing required character classes", () => {
    expect(validatePassword("alllowercase")).not.toBeNull();
    expect(validatePassword("ALLUPPERCASE1!")).not.toBeNull();
  });

  it("accepts a password meeting every backend rule", () => {
    expect(validatePassword("SuperSecret123!")).toBeNull();
  });
});

describe("passwordStrength", () => {
  it("scores weak and strong passwords differently", () => {
    expect(passwordStrength("")).toBe(0);
    expect(passwordStrength("SuperSecret123!")).toBe(5);
  });
});

describe("validateRequired", () => {
  it("flags empty/whitespace-only values", () => {
    expect(validateRequired("", "Name")).toMatch(/Name is required/);
    expect(validateRequired("   ", "Name")).toMatch(/Name is required/);
  });

  it("passes through valid values", () => {
    expect(validateRequired("Jane", "Name")).toBeNull();
  });
});

describe("validatePositiveNumber", () => {
  it("rejects non-numeric and non-positive values", () => {
    expect(validatePositiveNumber("abc", "Quantity")).not.toBeNull();
    expect(validatePositiveNumber("-5", "Quantity")).not.toBeNull();
    expect(validatePositiveNumber("0", "Quantity")).not.toBeNull();
  });

  it("accepts positive numbers", () => {
    expect(validatePositiveNumber("10", "Quantity")).toBeNull();
  });
});
