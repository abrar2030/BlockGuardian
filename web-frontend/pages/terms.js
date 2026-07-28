import PublicLayout from "../components/layout/PublicLayout";
import Card from "../components/ui/Card";

const SECTIONS = [
  {
    title: "1. Acceptance of terms",
    body: "By creating a BlockGuardian account you agree to these Terms of Service. If you do not agree, please do not use the platform.",
  },
  {
    title: "2. Not investment advice",
    body: "BlockGuardian is a portfolio tracking and analytics tool. Nothing on the platform constitutes investment, financial, legal, or tax advice. Performance figures, risk scores, and allocations are informational only.",
  },
  {
    title: "3. Account responsibilities",
    body: "You are responsible for maintaining the confidentiality of your password and any two-factor authentication backup codes, and for all activity that occurs under your account.",
  },
  {
    title: "4. Acceptable use",
    body: "You agree not to misuse the platform, including attempting to gain unauthorized access to other accounts, submitting malicious input, or interfering with normal service operation.",
  },
  {
    title: "5. Portfolio data",
    body: "Transactions you record represent your own tracking of positions. BlockGuardian does not execute trades with any brokerage, exchange, or custodian on your behalf.",
  },
  {
    title: "6. Service availability",
    body: "We aim for high availability but do not guarantee uninterrupted access. Features may change, and the service may be updated or modified over time.",
  },
  {
    title: "7. Termination",
    body: "You may stop using BlockGuardian at any time. We may suspend or terminate accounts that violate these terms or applicable law.",
  },
  {
    title: "8. Limitation of liability",
    body: "BlockGuardian is provided \u201cas is\u201d without warranties of any kind. To the fullest extent permitted by law, we are not liable for any indirect, incidental, or consequential damages arising from use of the platform.",
  },
];

export default function TermsPage() {
  return (
    <PublicLayout title="Terms of Service · BlockGuardian">
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
          Last updated: January 2026
        </p>

        <Card className="mt-8 space-y-8">
          {SECTIONS.map((s) => (
            <div key={s.title}>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-2">
                {s.title}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {s.body}
              </p>
            </div>
          ))}
        </Card>
      </section>
    </PublicLayout>
  );
}
