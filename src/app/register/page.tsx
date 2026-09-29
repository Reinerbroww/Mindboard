import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/register-form";
import { Brand } from "@/components/brand";

export const metadata: Metadata = {
  title: "Register",
};

export default function RegisterPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Brand large />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            Create Account
          </h1>
        </div>
        <Suspense fallback={<RegisterFormSkeleton />}>
          <RegisterForm />
        </Suspense>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

function RegisterFormSkeleton() {
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
      <div className="flex flex-col gap-2">
        <div className="h-4 w-16 rounded bg-muted" />
        <div className="h-10 rounded-lg border border-border bg-card" />
      </div>
      <div className="mt-2 h-12 rounded-lg bg-muted" />
    </div>
  );
}