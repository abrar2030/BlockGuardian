import Link from "next/link";
import PublicLayout from "../components/layout/PublicLayout";
import Button from "../components/ui/Button";
import { ROUTES } from "../utils/constants";

export default function NotFoundPage() {
  return (
    <PublicLayout title="Page Not Found · BlockGuardian" hideFooter>
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-8xl font-extrabold gradient-text">404</p>
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
            Page not found
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            The page you&apos;re looking for doesn&apos;t exist or may have been
            moved.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href={ROUTES.HOME}>
              <Button>Back to homepage</Button>
            </Link>
            <Link href={ROUTES.DASHBOARD} className="btn-secondary">
              Go to dashboard
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
