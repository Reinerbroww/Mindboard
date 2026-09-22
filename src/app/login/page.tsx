import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Login",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: errorParam } = await searchParams;
  const error = errorParam ? decodeURIComponent(errorParam) : undefined;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-xl font-semibold tracking-tight">
            Mindboard
          </Link>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            Welcome Back
          </h1>
        </div>
        <Suspense fallback={<LoginFormSkeleton />}>
          <LoginForm initialError={error} />
        </Suspense>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-primary hover:underline"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="h-4 w-16 rounded bg-muted" />
        <div className="h-10 rounded-lg border border-border bg-card" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-4 w-16 rounded bg-muted" />
        <div className="h-10 rounded-lg border border-border bg-card" />
      </div>
      <div className="mt-2 h-12 rounded-lg bg-muted" />
    </div>
  );
}