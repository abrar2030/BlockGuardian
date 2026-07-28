import Head from "next/head";
import PublicNavbar from "./PublicNavbar";
import Footer from "./Footer";

export default function PublicLayout({
  children,
  title = "BlockGuardian — Modern Portfolio Management",
  description = "Track, analyze, and grow your investment portfolio with BlockGuardian's real-time analytics and risk monitoring.",
  hideFooter = false,
}) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Head>
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
        <PublicNavbar />
        <main className="flex-1">{children}</main>
        {!hideFooter && <Footer />}
      </div>
    </>
  );
}
