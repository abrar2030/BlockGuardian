import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";
import { PageLoader } from "./ui/Spinner";
import { ROUTES } from "../utils/constants";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(
        `${ROUTES.LOGIN}?next=${encodeURIComponent(router.asPath)}`,
      );
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <PageLoader label="Checking your session..." />
      </div>
    );
  }

  return children;
}
