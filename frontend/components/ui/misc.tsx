import * as React from "react";
import { cn } from "@/lib/utils";

export function Spinner({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      className={cn("animate-spin h-4 w-4", className)}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export function Alert({
  variant = "default",
  children,
  className,
}: {
  variant?: "default" | "destructive" | "success";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative w-full rounded-lg border px-4 py-3 text-sm flex items-start gap-2",
        variant === "destructive" &&
          "border-[hsl(var(--destructive))]/50 bg-[hsl(var(--destructive))]/10 text-red-400",
        variant === "success" &&
          "border-green-500/50 bg-green-500/10 text-green-400",
        variant === "default" &&
          "border-[hsl(var(--border))] bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]",
        className
      )}
    >
      {children}
    </div>
  );
}
