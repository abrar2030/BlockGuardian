import Link from "next/link";
import { useRouter } from "next/router";
import Logo from "../Logo";
import { ROUTES } from "../../utils/constants";

const NAV_ITEMS = [
  {
    href: ROUTES.DASHBOARD,
    label: "Dashboard",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 16.5a2.25 2.25 0 012.25-2.25h2.25a2.25 2.25 0 012.25 2.25v1.5a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25v-1.5zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 16.5a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25v1.5A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-1.5z"
      />
    ),
  },
  {
    href: ROUTES.PORTFOLIOS,
    label: "Portfolios",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 18L9 11.25l4.306 4.306a11.95 11.95 0 015.814-5.518l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941"
      />
    ),
    match: (path) => path.startsWith("/portfolios"),
  },
  {
    href: ROUTES.MARKETS,
    label: "Markets",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    ),
  },
  {
    href: ROUTES.ACCOUNT,
    label: "Account",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
      />
    ),
  },
];

export default function DashboardSidebar({ open, onClose }) {
  const router = useRouter();

  const isActive = (item) =>
    item.match ? item.match(router.pathname) : router.pathname === item.href;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-gray-900/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col transition-transform duration-300 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="h-16 flex items-center px-5 border-b border-gray-100 dark:border-gray-800">
          <Logo />
        </div>
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto scrollbar-thin">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive(item)
                  ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                {item.icon}
              </svg>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 p-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
              Demo environment
            </p>
            <p className="text-sm mt-1 leading-snug">
              Trades execute against sample market data. No real funds are
              involved.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
