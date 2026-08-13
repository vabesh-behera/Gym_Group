import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 flex-col justify-between bg-navy p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20 text-accent">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 4v16M18 4v16M2 9h4M2 15h4M18 9h4M18 15h4M6 12h12" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-bold">GymIQ</p>
            <p className="text-xs text-white/60">Gym Group — Club Portfolio</p>
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-bold leading-tight">
            Campaign performance &amp; capacity intelligence for every club.
          </h1>
          <p className="mt-4 max-w-md text-sm text-white/70">
            Plan, simulate, and monitor acquisition and utilisation campaigns across your
            portfolio — with AI-backed recommendations grounded in real club capacity data.
          </p>
        </div>
        <p className="text-xs text-white/40">© {new Date().getFullYear()} Gym Group</p>
      </div>
      <div className="flex w-full flex-col justify-center bg-page px-8 py-12 lg:w-1/2">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <p className="text-lg font-bold text-navy">GymIQ</p>
            <p className="text-xs text-muted">Gym Group — Club Portfolio</p>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Sign in</h2>
          <p className="mt-1 mb-6 text-sm text-muted">Access your club portfolio dashboard.</p>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
