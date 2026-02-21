"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, ArrowLeft } from "lucide-react";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, Spinner } from "@/components/ui/misc";
import { AxiosError } from "axios";

const schema = z.object({
  email: z.string().email("Please enter a valid email"),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      await authApi.forgotPassword(data.email);
      setSuccess(true);
    } catch (err) {
      const axiosErr = err as AxiosError<{ message: string }>;
      // WHY always show success: Prevents user enumeration
      // Even on error, show the same success message
      if (axiosErr.response?.status === 404) {
        setSuccess(true);
      } else {
        setError(axiosErr.response?.data?.message || "Something went wrong. Please try again.");
      }
    }
  };

  if (success) {
    return (
      <div>
        <div className="flex items-center justify-center w-14 h-14 rounded-full mb-6 mx-auto"
          style={{ background: "hsl(var(--primary))/15", border: "2px solid hsl(var(--primary))/30" }}>
          <Mail className="w-6 h-6" style={{ color: "hsl(var(--primary))" }} />
        </div>
        <h1 className="text-2xl font-bold text-center mb-2" style={{ color: "hsl(var(--foreground))" }}>
          Check your email
        </h1>
        <p className="text-center text-sm mb-6" style={{ color: "hsl(var(--muted-foreground))" }}>
          If an account exists for that email, we sent a password reset link. Check your inbox.
        </p>
        <Link href="/login">
          <Button variant="outline" className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to sign in
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: "hsl(var(--foreground))" }}>
          Forgot password?
        </h1>
        <p className="mt-1 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </Alert>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
          {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Spinner className="mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
          {isSubmitting ? "Sending..." : "Send reset link"}
        </Button>
      </form>

      <p className="mt-6 text-center">
        <Link href="/login" className="text-sm flex items-center justify-center gap-1 hover:underline"
          style={{ color: "hsl(var(--muted-foreground))" }}>
          <ArrowLeft className="h-3 w-3" /> Back to sign in
        </Link>
      </p>
    </div>
  );
}
