const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,32}$/;

export function validateEmail(email) {
  if (!email) return "Email is required";
  if (email.length > 254) return "Email is too long";
  if (!EMAIL_PATTERN.test(email.trim().toLowerCase()))
    return "Enter a valid email address";
  return null;
}

export function validateUsername(username) {
  if (!username) return "Username is required";
  if (!USERNAME_PATTERN.test(username.trim()))
    return "3-32 characters: letters, numbers, underscores, and hyphens only";
  return null;
}

export const PASSWORD_RULES = [
  {
    key: "length",
    label: "At least 12 characters",
    test: (v) => v.length >= 12,
  },
  { key: "upper", label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { key: "lower", label: "One lowercase letter", test: (v) => /[a-z]/.test(v) },
  { key: "digit", label: "One number", test: (v) => /\d/.test(v) },
  {
    key: "special",
    label: "One special character",
    test: (v) => /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(v),
  },
];

export function validatePassword(password) {
  if (!password) return "Password is required";
  const failed = PASSWORD_RULES.find((rule) => !rule.test(password));
  if (failed) return failed.label + " is required";
  if (password.length > 128) return "Password is too long";
  return null;
}

export function validateRequired(value, label = "This field") {
  if (value === undefined || value === null || String(value).trim() === "") {
    return `${label} is required`;
  }
  return null;
}

export function validatePositiveNumber(value, label = "Value") {
  const num = Number(value);
  if (
    value === "" ||
    value === null ||
    value === undefined ||
    Number.isNaN(num)
  ) {
    return `${label} must be a number`;
  }
  if (num <= 0) return `${label} must be greater than zero`;
  return null;
}
