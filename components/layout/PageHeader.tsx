import type { ReactNode } from "react";
import { getDemoUser } from "@/lib/demo-user";
import { UserMenu } from "@/components/layout/UserMenu";

export async function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const user = await getDemoUser();
  const name = user?.name ?? "Guest";
  const role = user?.role ?? "Portfolio Manager";
  const initials = user?.initials ?? "GG";

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-card px-8 py-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        {actions}
        <UserMenu name={name} role={role} initials={initials} />
      </div>
    </div>
  );
}
