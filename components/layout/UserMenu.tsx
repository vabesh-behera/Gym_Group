export function UserMenu({ name, role, initials }: { name: string; role: string; initials: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-info text-xs font-bold text-white">
        {initials}
      </div>
      <div className="hidden text-left sm:block">
        <p className="text-sm font-semibold leading-none text-slate-900">{name}</p>
        <p className="mt-1 text-[11px] leading-none text-muted">{role}</p>
      </div>
    </div>
  );
}
