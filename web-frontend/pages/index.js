import Link from "next/link";
import { useRouter } from "next/router";
import PublicLayout from "../components/layout/PublicLayout";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";
import { ROUTES } from "../utils/constants";

const FEATURES = [
  {
    title: "Multi-asset portfolios",
    description:
      "Track stocks, ETFs, cryptocurrency, bonds, and more inside unlimited portfolios, each with its own risk profile.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 18L9 11.25l4.306 4.306a11.95 11.95 0 015.814-5.518l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941"
      />
    ),
  },
  {
    title: "Real-time performance",
    description:
      "See unrealized and realized P&L, total return, and cash balance update the moment you execute a trade.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z"
      />
    ),
  },
  {
    title: "Risk monitoring",
    description:
      "Automatic volatility, risk-score, and concentration checks flag positions that breach your own limits.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-8.25 3.375h.008v.008h-.008v-.008z"
      />
    ),
  },
  {
    title: "Bank-grade security",
    description:
      "Encrypted credentials, JWT session management, and optional two-factor authentication protect every account.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75l2.25 2.25 4.5-4.5m4.5.75a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
  {
    title: "Transaction history",
    description:
      "Every buy, sell, and adjustment is logged with full detail so you can audit performance over time.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3.75m8.5-3.75l1 3.75m-9.5 0h9.5"
      />
    ),
  },
  {
    title: "Asset discovery",
    description:
      "Search a curated market catalog across equities, crypto, and funds before adding a position.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
      />
    ),
  },
];

const STEPS = [
  {
    n: "01",
    title: "Create your free account",
    description:
      "Sign up in under a minute with just your name, email, and a secure password.",
  },
  {
    n: "02",
    title: "Build a portfolio",
    description:
      "Set a risk profile, base currency, and starting cash: personal, retirement, or business.",
  },
  {
    n: "03",
    title: "Track & trade",
    description:
      "Buy and sell across asset classes and watch performance, allocation, and risk update live.",
  },
];

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-indigo-50 via-white to-white dark:from-indigo-950/40 dark:via-gray-950 dark:to-gray-950" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-violet-300/30 dark:bg-violet-700/20 rounded-full blur-3xl -z-10" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-300/30 dark:bg-indigo-700/20 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-6 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse-glow" />
            Multi-asset portfolio management, reimagined
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white text-balance">
            Guard and grow your <span className="gradient-text">portfolio</span>
            <br className="hidden sm:block" /> with total clarity
          </h1>
          <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto text-balance">
            BlockGuardian brings real-time performance tracking, allocation
            breakdowns, and automated risk monitoring together in one clean
            dashboard for stocks, crypto, and everything in between.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            {isAuthenticated ? (
              <Button size="lg" onClick={() => router.push(ROUTES.DASHBOARD)}>
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button size="lg" onClick={() => router.push(ROUTES.REGISTER)}>
                  Create free account
                </Button>
                <Link
                  href={ROUTES.LOGIN}
                  className="btn-secondary text-base px-6 py-3"
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
          <p className="mt-5 text-sm text-gray-400 dark:text-gray-500">
            No credit card required · Set up a portfolio in minutes
          </p>
        </div>
      </section>

      {/* Feature grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Everything you need to manage your investments
          </h2>
          <p className="mt-3 text-gray-500 dark:text-gray-400">
            A complete toolkit built for individual investors who want
            institutional-grade visibility.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <Card key={f.title} hover className="animate-fade-in">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.75}
                >
                  {f.icon}
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {f.title}
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                {f.description}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white dark:bg-gray-900/50 border-y border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Get started in three steps
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step) => (
              <div key={step.n} className="relative">
                <span className="text-5xl font-extrabold text-indigo-100 dark:text-indigo-900/60">
                  {step.n}
                </span>
                <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      {!isAuthenticated && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 px-8 py-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,white,transparent_60%)]" />
            <h2 className="text-3xl sm:text-4xl font-bold text-white relative">
              Ready to take control of your portfolio?
            </h2>
            <p className="mt-3 text-indigo-100 max-w-xl mx-auto relative">
              Join BlockGuardian today and start tracking your investments with
              real clarity.
            </p>
            <div className="mt-8 relative">
              <Button
                size="lg"
                variant="secondary"
                onClick={() => router.push(ROUTES.REGISTER)}
                className="!bg-white !text-indigo-700 hover:!bg-indigo-50"
              >
                Create your free account
              </Button>
            </div>
          </div>
        </section>
      )}
    </PublicLayout>
  );
}
