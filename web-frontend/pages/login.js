import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import PublicLayout from "../components/layout/PublicLayout";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { ROUTES } from "../utils/constants";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaToken, setMfaToken] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!email || !password) {
      setErrors({
        email: !email ? "Email is required" : undefined,
        password: !password ? "Password is required" : undefined,
      });
      return;
    }
    if (mfaRequired && mfaToken.trim().length < 6) {
      setErrors({ mfa: "Enter the 6-digit code from your authenticator app" });
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(
        email.trim(),
        password,
        mfaRequired ? mfaToken.trim() : undefined,
      );
      if (result.mfaRequired) {
        setMfaRequired(true);
        toast.info("Enter your two-factor authentication code to continue.");
        return;
      }
      toast.success(`Welcome back, ${result.user?.first_name || "there"}!`);
      const next = router.query.next;
      router.push(typeof next === "string" ? next : ROUTES.DASHBOARD);
    } catch (err) {
      if (err.status === 423) {
        setErrors({
          form: "This account is temporarily locked due to failed sign-in attempts.",
        });
      } else {
        setErrors({
          form: err.message || "Unable to sign in. Please try again.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PublicLayout title="Sign In · BlockGuardian" hideFooter>
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {mfaRequired ? "Two-factor verification" : "Welcome back"}
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {mfaRequired
                ? "Enter the code from your authenticator app"
                : "Sign in to continue to your dashboard"}
            </p>
          </div>

          <div className="card p-7 sm:p-8">
            {errors.form && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 text-sm text-red-700 dark:text-red-400">
                {errors.form}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {!mfaRequired ? (
                <>
                  <Input
                    id="email"
                    label="Email address"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={errors.email}
                    required
                  />
                  <Input
                    id="password"
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                </>
              ) : (
                <Input
                  id="mfaToken"
                  label="Authentication code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  maxLength={6}
                  autoFocus
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                  value={mfaToken}
                  onChange={(e) =>
                    setMfaToken(e.target.value.replace(/\D/g, ""))
                  }
                  error={errors.mfa}
                />
              )}

              <Button type="submit" fullWidth size="lg" isLoading={isLoading}>
                {mfaRequired ? "Verify & sign in" : "Sign in"}
              </Button>

              {mfaRequired && (
                <button
                  type="button"
                  onClick={() => {
                    setMfaRequired(false);
                    setMfaToken("");
                    setErrors({});
                  }}
                  className="w-full text-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  ← Back to email &amp; password
                </button>
              )}
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Don&apos;t have an account?{" "}
            <Link
              href={ROUTES.REGISTER}
              className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
            >
              Create one for free
            </Link>
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
