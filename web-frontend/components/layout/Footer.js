import Link from "next/link";
import Logo from "../Logo";
import { ROUTES } from "../../utils/constants";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: ROUTES.MARKETS, label: "Markets" },
      { href: ROUTES.REGISTER, label: "Create Account" },
      { href: ROUTES.LOGIN, label: "Sign In" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: ROUTES.ABOUT, label: "About" },
      { href: ROUTES.CONTACT, label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: ROUTES.PRIVACY, label: "Privacy Policy" },
      { href: ROUTES.TERMS, label: "Terms of Service" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2">
            <Logo />
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs">
              Modern portfolio management with real-time analytics, risk
              monitoring, and multi-asset support.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                {col.title}
              </h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 pt-6 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            &copy; {new Date().getFullYear()} BlockGuardian. All rights
            reserved.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Portfolio data shown is illustrative and not investment advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
