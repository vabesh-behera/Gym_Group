import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";

// All dashboard pages read live database data — never prerender them.
export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
