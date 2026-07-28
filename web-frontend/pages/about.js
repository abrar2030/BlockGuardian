import PublicLayout from "../components/layout/PublicLayout";
import Card from "../components/ui/Card";

const VALUES = [
  {
    title: "Clarity over complexity",
    description:
      "Investment data is presented plainly — real numbers, real positions, no jargon-heavy dashboards.",
  },
  {
    title: "Security by default",
    description:
      "Encrypted credentials, audited authentication flows, and optional two-factor authentication protect every account.",
  },
  {
    title: "Built for every asset class",
    description:
      "Stocks, ETFs, crypto, bonds, and more live side by side in the same portfolio view.",
  },
];

export default function AboutPage() {
  return (
    <PublicLayout title="About · BlockGuardian">
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white">
          About <span className="gradient-text">BlockGuardian</span>
        </h1>
        <p className="mt-5 text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
          BlockGuardian is a portfolio management platform built for investors
          who want a single, honest view of what they own — across stocks,
          funds, and digital assets — with the risk monitoring tools usually
          reserved for institutional desks.
        </p>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid sm:grid-cols-3 gap-6">
          {VALUES.map((v) => (
            <Card key={v.title}>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {v.title}
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                {v.description}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-white dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            What we&apos;re building
          </h2>
          <p className="mt-4 text-gray-500 dark:text-gray-400 leading-relaxed">
            Every portfolio you create tracks real transactions, computes live
            performance, allocation, and risk metrics, and flags positions that
            breach the limits you set — no black-box predictions, just
            transparent math you can verify.
          </p>
        </div>
      </section>
    </PublicLayout>
  );
}
