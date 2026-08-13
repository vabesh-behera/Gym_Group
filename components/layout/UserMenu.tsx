"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";

export function UserMenu({
  name,
  role,
  initials,
}: {
  name: string;
  role: string;
  initials: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-slate-100"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-info text-xs font-bold text-white">
          {initials}
        </div>
        <div className="hidden text-left sm:block">
          <p className="text-sm font-semibold leading-none text-slate-900">{name}</p>
          <p className="mt-1 text-[11px] leading-none text-muted">{role}</p>
        </div>
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-40 rounded-lg border border-border bg-white py-1 shadow-lg">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="block w-full px-3.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
