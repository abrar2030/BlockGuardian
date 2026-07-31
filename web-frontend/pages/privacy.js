import PublicLayout from "../components/layout/PublicLayout";
import Card from "../components/ui/Card";

const SECTIONS = [
  {
    title: "1. Information we collect",
    body: "When you create a BlockGuardian account, we collect the information you provide directly: your name, email address, username, and optionally your phone number, country, and city. We also record portfolio, holding, and transaction data you create while using the platform.",
  },
  {
    title: "2. How we use your information",
    body: "Your information is used to operate your account, compute portfolio performance and risk metrics, secure your session, and communicate important account or security notices.",
  },
  {
    title: "3. Data protection",
    body: "Sensitive fields such as phone number and address are encrypted at rest. Passwords are never stored in plain text; they are hashed and salted. Session access is controlled with short-lived access tokens and longer-lived refresh tokens.",
  },
  {
    title: "4. Two-factor authentication",
    body: "You may optionally enable time-based one-time password (TOTP) two-factor authentication. Backup codes are shown once at setup time, so store them securely, as we cannot recover them for you.",
  },
  {
    title: "5. Data sharing",
    body: "We do not sell your personal information. Data is not shared with third parties except where required to operate the service or comply with the law.",
  },
  {
    title: "6. Your choices",
    body: "You can update your profile information, change your password, and enable or disable two-factor authentication at any time from your Account Settings page. You may delete individual portfolios you no longer need.",
  },
  {
    title: "7. Changes to this policy",
    body: "We may update this policy from time to time. Material changes will be reflected on this page with an updated revision date.",
  },
];

export default function PrivacyPage() {
  return (
    <PublicLayout title="Privacy Policy · BlockGuardian">
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
          Privacy Policy
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
