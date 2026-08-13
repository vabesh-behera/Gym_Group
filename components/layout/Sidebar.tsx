"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_SECTIONS } from "@/lib/constants";
import { NAV_ICONS, GearIcon } from "@/components/layout/Icons";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-navy text-white">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/20 text-accent">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 4v16M18 4v16M2 9h4M2 15h4M18 9h4M18 15h4M6 12h12" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold leading-none">GymIQ</p>
          <p className="mt-1 text-[11px] text-white/50">by Gym Group Insights</p>
        </div>
      </div>

      <div className="mx-4 mb-2 flex items-center gap-3 rounded-lg border border-navy-border/60 px-3 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-navy">
          GG
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Gym Group</p>
          <p className="truncate text-[11px] text-white/50">Club Portfolio</p>
        </div>
      </div>

      <nav className="mt-2 flex-1 overflow-y-auto px-3 pb-4 scrollbar-thin">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-1">
            <p className="px-2 pt-4 pb-1.5 text-[10.5px] font-semibold tracking-wider text-white/40 uppercase">
              {section.label}
            </p>
            {section.items.map((item) => {
              const Icon = NAV_ICONS[item.icon];
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition ${
                    active
                      ? "bg-white/10 font-semibold text-white"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-accent" />
                  )}
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-navy-border/60 px-3 py-3">
        <Link
          href="/settings"
          className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition ${
            pathname.startsWith("/settings")
              ? "bg-white/10 font-semibold text-white"
              : "text-white/70 hover:bg-white/5 hover:text-white"
          }`}
        >
          <GearIcon className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
