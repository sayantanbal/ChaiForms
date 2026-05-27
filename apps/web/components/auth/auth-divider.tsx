type AuthDividerProps = {
  label?: string;
};

export function AuthDivider({ label = "or" }: AuthDividerProps) {
  return (
    <div className="relative flex items-center py-1">
      <div className="grow border-t border-slate-200" />
      <span className="mx-3 shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <div className="grow border-t border-slate-200" />
    </div>
  );
}
