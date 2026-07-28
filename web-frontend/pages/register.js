import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import PublicLayout from "../components/layout/PublicLayout";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import PasswordStrength from "../components/ui/PasswordStrength";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { ROUTES } from "../utils/constants";
import {
  validateEmail,
  validatePassword,
  validateUsername,
  validateRequired,
} from "../lib/validators";

const COUNTRIES = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "IN", label: "India" },
  { value: "PK", label: "Pakistan" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "SG", label: "Singapore" },
  { value: "JP", label: "Japan" },
  { value: "BR", label: "Brazil" },
  { value: "OTHER", label: "Other" },
];

export default function RegisterPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    country: "US",
    phoneNumber: "",
  });
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const update = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const next = {
      firstName: validateRequired(form.firstName, "First name"),
      lastName: validateRequired(form.lastName, "Last name"),
      email: validateEmail(form.email),
      username: validateUsername(form.username),
      password: validatePassword(form.password),
      confirmPassword:
        form.password !== form.confirmPassword
          ? "Passwords do not match"
          : null,
      agreed: !agreed ? "You must accept the terms to continue" : null,
    };
    setErrors(next);
    return Object.values(next).every((v) => !v);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const user = await register({
        email: form.email.trim().toLowerCase(),
        username: form.username.trim(),
        password: form.password,
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        country: form.country || undefined,
        phone_number: form.phoneNumber.trim() || undefined,
      });
      toast.success(`Welcome to BlockGuardian, ${user.first_name}!`);
      router.push(ROUTES.DASHBOARD);
    } catch (err) {
      if (err.field) {
        setErrors((prev) => ({ ...prev, [mapField(err.field)]: err.message }));
      } else {
        setErrors((prev) => ({
          ...prev,
          form: err.message || "Registration failed. Please try again.",
        }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PublicLayout title="Create Account · BlockGuardian" hideFooter>
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Create your account
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Start tracking your portfolio in minutes
            </p>
          </div>

          <div className="card p-7 sm:p-8">
            {errors.form && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 text-sm text-red-700 dark:text-red-400">
                {errors.form}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  id="firstName"
                  label="First name"
                  placeholder="Jane"
                  autoComplete="given-name"
                  value={form.firstName}
                  onChange={update("firstName")}
                  error={errors.firstName}
                  required
                />
                <Input
                  id="lastName"
                  label="Last name"
                  placeholder="Doe"
                  autoComplete="family-name"
                  value={form.lastName}
                  onChange={update("lastName")}
                  error={errors.lastName}
                  required
                />
              </div>

              <Input
                id="email"
                label="Email address"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={update("email")}
                error={errors.email}
                required
              />

              <Input
                id="username"
                label="Username"
                autoComplete="username"
                placeholder="jane_doe"
                value={form.username}
                onChange={update("username")}
                error={errors.username}
                hint={
                  !errors.username
                    ? "3-32 characters: letters, numbers, _ and -"
                    : undefined
                }
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <Select
                  id="country"
                  label="Country"
                  options={COUNTRIES}
                  value={form.country}
                  onChange={update("country")}
                />
                <Input
                  id="phoneNumber"
                  label="Phone (optional)"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+1 555 123 4567"
                  value={form.phoneNumber}
                  onChange={update("phoneNumber")}
                />
              </div>

              <div>
                <Input
                  id="password"
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••••••"
                  value={form.password}
                  onChange={update("password")}
                  error={errors.password}
                  required
                  rightElement={
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((s) => !s)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.75}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.75}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      )}
                    </button>
                  }
                />
                <PasswordStrength password={form.password} />
              </div>

              <Input
                id="confirmPassword"
                label="Confirm password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••••••"
                value={form.confirmPassword}
                onChange={update("confirmPassword")}
                error={errors.confirmPassword}
                required
              />

              <div>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    I agree to the{" "}
                    <Link
                      href={ROUTES.TERMS}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      href={ROUTES.PRIVACY}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Privacy Policy
                    </Link>
                  </span>
                </label>
                {errors.agreed && (
                  <p className="mt-1.5 text-sm text-red-500">{errors.agreed}</p>
                )}
              </div>

              <Button type="submit" fullWidth size="lg" isLoading={isLoading}>
                Create account
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{" "}
            <Link
              href={ROUTES.LOGIN}
              className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}

function mapField(backendField) {
  const map = {
    first_name: "firstName",
    last_name: "lastName",
    phone_number: "phoneNumber",
  };
  return map[backendField] || backendField;
}
