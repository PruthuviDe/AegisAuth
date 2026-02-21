import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — AegisAuth",
};

// Dashboard layout: protected by middleware
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "hsl(var(--background))" }}>
      {/* Top nav */}
      <header className="border-b" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md flex items-center justify-center"
              style={{ background: "hsl(var(--primary))" }}>
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="font-semibold" style={{ color: "hsl(var(--foreground))" }}>AegisAuth</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/dashboard"
              className="text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>
              Dashboard
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-10">{children}</main>
    </div>
  );
}
