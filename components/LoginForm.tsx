"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("sarah.johnson@gymgroup.co.uk");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push(searchParams.get("callbackUrl") || "/analytics");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent-soft"
          placeholder="you@gymgroup.co.uk"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent-soft"
          placeholder="••••••••"
        />
      </div>
      {error && <p className="text-sm text-critical">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="mt-2 w-full rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-soft disabled:opacity-60"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-xs text-muted">
        Demo credentials are pre-filled — just set a password after seeding.
      </p>
    </form>
  );
}
