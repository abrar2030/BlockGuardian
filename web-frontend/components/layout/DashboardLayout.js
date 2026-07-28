import { useState } from "react";
import Head from "next/head";
import ProtectedRoute from "../ProtectedRoute";
import DashboardSidebar from "./DashboardSidebar";
import DashboardTopbar from "./DashboardTopbar";

export default function DashboardLayout({ children, title = "Dashboard" }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ProtectedRoute>
      <Head>
        <title>{title} · BlockGuardian</title>
      </Head>
      <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
        <DashboardSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="flex-1 min-w-0 flex flex-col">
          <DashboardTopbar
            title={title}
            onMenuClick={() => setSidebarOpen(true)}
          />
          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
