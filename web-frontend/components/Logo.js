import Link from "next/link";
import { ROUTES } from "../utils/constants";

export default function Logo({
  size = "md",
  withText = true,
  href = ROUTES.HOME,
}) {
  const dims =
    size === "sm" ? "w-7 h-7" : size === "lg" ? "w-11 h-11" : "w-9 h-9";
  const textSize =
    size === "sm" ? "text-base" : size === "lg" ? "text-2xl" : "text-lg";

  const mark = (
    <div
      className={`${dims} rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm flex-shrink-0`}
    >
      <svg
        className="w-[55%] h-[55%] text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75l2.25 2.25 4.5-4.5m4.5.75a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </div>
  );

  const content = (
    <span className="inline-flex items-center gap-2.5">
      {mark}
      {withText && (
        <span className={`font-bold tracking-tight gradient-text ${textSize}`}>
          BlockGuardian
        </span>
      )}
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} className="inline-flex items-center">
      {content}
    </Link>
  );
}
