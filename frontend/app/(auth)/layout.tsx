// Shared layout for all auth pages (login, register, etc.)
// Clean centered layout with branding

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left: Branding panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(222 47% 12%) 100%)" }}>
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }} />

        {/* Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl opacity-20"
          style={{ background: "hsl(var(--primary))" }} />

        <div className="relative z-10 text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: "hsl(var(--primary))" }}>
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="text-3xl font-bold" style={{ color: "hsl(var(--foreground))" }}>
              AegisAuth
            </span>
          </div>

          <h2 className="text-2xl font-semibold mb-3" style={{ color: "hsl(var(--foreground))" }}>
            Secure by default.
          </h2>
          <p className="text-base max-w-xs leading-relaxed" style={{ color: "hsl(var(--muted-foreground))" }}>
            Production-grade authentication with JWT tokens, OAuth, RBAC, and more.
          </p>

          {/* Feature list */}
          <div className="mt-10 space-y-3 text-left">
            {[
              "Argon2 password hashing",
              "HTTP-only cookie tokens",
              "Role-based access control",
              "Google & GitHub OAuth",
            ].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "hsl(var(--primary))/20", border: "1px solid hsl(var(--primary))" }}>
                  <svg className="w-3 h-3" style={{ color: "hsl(var(--primary))" }} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Auth form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12"
        style={{ background: "hsl(var(--background))" }}>
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "hsl(var(--primary))" }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="text-xl font-bold" style={{ color: "hsl(var(--foreground))" }}>AegisAuth</span>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
