"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle } from "lucide-react";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided.");
      return;
    }
    authApi.verifyEmail(token)
      .then(() => {
        setStatus("success");
        setMessage("Your email has been verified successfully!");
      })
      .catch(() => {
        setStatus("error");
        setMessage("This verification link is invalid or has expired. Please request a new one.");
      });
  }, [token]);

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center gap-4">
        <Spinner className="w-8 h-8" style={{ color: "hsl(var(--primary))" }} />
        <p style={{ color: "hsl(var(--muted-foreground))" }}>Verifying your email...</p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="flex justify-center mb-4">
        {status === "success"
          ? <CheckCircle className="w-14 h-14 text-green-400" />
          : <XCircle className="w-14 h-14 text-red-400" />}
      </div>
      <h1 className="text-2xl font-bold mb-2" style={{ color: "hsl(var(--foreground))" }}>
        {status === "success" ? "Email Verified!" : "Verification Failed"}
      </h1>
      <p className="text-sm mb-6" style={{ color: "hsl(var(--muted-foreground))" }}>{message}</p>
      <Link href="/login">
        <Button className="w-full">Go to sign in</Button>
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex justify-center"><Spinner className="w-8 h-8" /></div>}>
      <VerifyContent />
    </Suspense>
  );
}
