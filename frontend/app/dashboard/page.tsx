"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, Spinner } from "@/components/ui/misc";
import { LogOut, Shield, Mail, CheckCircle, AlertCircle, User, Clock } from "lucide-react";

export default function DashboardPage() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="w-8 h-8" style={{ color: "hsl(var(--primary))" }} />
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
  const initials = (user.firstName?.[0] || "") + (user.lastName?.[0] || "") || user.email[0].toUpperCase();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "hsl(var(--foreground))" }}>
            Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
            Welcome back, {user.firstName || "there"}!
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout} disabled={loggingOut}>
          {loggingOut ? <Spinner className="mr-2" /> : <LogOut className="h-4 w-4 mr-2" />}
          Sign out
        </Button>
      </div>

      {/* Email not verified warning */}
      {!user.isEmailVerified && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          Your email address hasn&apos;t been verified yet. Check your inbox for a verification link.
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Profile card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
              Profile
            </CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Avatar */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                style={{ background: "hsl(var(--primary))", color: "#fff" }}>
                {initials}
              </div>
              <div>
                <p className="font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                  {displayName}
                </p>
                <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {user.email}
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <InfoRow icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={user.email} />
              <InfoRow
                icon={user.isEmailVerified
                  ? <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                  : <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />}
                label="Email status"
                value={user.isEmailVerified ? "Verified" : "Not verified"}
              />
              {user.firstName && (
                <InfoRow icon={<User className="w-3.5 h-3.5" />} label="First name" value={user.firstName} />
              )}
              {user.lastName && (
                <InfoRow icon={<User className="w-3.5 h-3.5" />} label="Last name" value={user.lastName} />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Roles & Security card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
              Roles & Security
            </CardTitle>
            <CardDescription>Your permissions and account security</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: "hsl(var(--muted-foreground))" }}>ASSIGNED ROLES</p>
              <div className="flex flex-wrap gap-2">
                {(user.roles ?? []).length > 0 ? user.roles!.map((role) => (
                  <span key={role} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      background: "hsl(var(--primary))/15",
                      border: "1px solid hsl(var(--primary))/30",
                      color: "hsl(var(--primary))",
                    }}>
                    {role}
                  </span>
                )) : (
                  <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>No roles assigned</span>
                )}
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <InfoRow
                icon={<Clock className="w-3.5 h-3.5" />}
                label="Account created"
                value={new Date(user.createdAt).toLocaleDateString("en-US", {
                  year: "numeric", month: "short", day: "numeric",
                })}
              />
              <InfoRow
                icon={<Shield className="w-3.5 h-3.5" />}
                label="2FA"
                value={user.isTwoFactorEnabled ? "Enabled" : "Not enabled"}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API info card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">API Information</CardTitle>
          <CardDescription>Backend endpoints available on this instance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { method: "POST", path: "/api/auth/register", desc: "Create account" },
              { method: "POST", path: "/api/auth/login", desc: "Sign in" },
              { method: "POST", path: "/api/auth/logout", desc: "Sign out" },
              { method: "POST", path: "/api/auth/refresh", desc: "Refresh tokens" },
              { method: "POST", path: "/api/auth/verify-email", desc: "Verify email" },
              { method: "GET",  path: "/api/users/me", desc: "Current user profile" },
            ].map((ep) => (
              <div key={ep.path} className="rounded-md p-3"
                style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-bold"
                    style={{ color: ep.method === "GET" ? "#34d399" : "#60a5fa" }}>
                    {ep.method}
                  </span>
                </div>
                <p className="text-xs font-mono mb-1" style={{ color: "hsl(var(--foreground))" }}>{ep.path}</p>
                <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{ep.desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
            Interactive docs at{" "}
            <a href="http://localhost:3000/api/docs" target="_blank" rel="noreferrer"
              className="hover:underline" style={{ color: "hsl(var(--primary))" }}>
              localhost:3000/api/docs
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 border-b"
      style={{ borderColor: "hsl(var(--border))" }}>
      <div className="flex items-center gap-1.5">
        <span style={{ color: "hsl(var(--muted-foreground))" }}>{icon}</span>
        <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{label}</span>
      </div>
      <span className="text-xs font-medium" style={{ color: "hsl(var(--foreground))" }}>{value}</span>
    </div>
  );
}
