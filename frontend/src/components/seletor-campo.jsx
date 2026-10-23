export function Seletor({ id, label, children, className = '', ...props }) {
  return (
    <div className={`flex min-w-0 flex-col gap-2 text-left ${className}`}>
      {label && <label htmlFor={id} className="text-sm font-medium">{label}</label>}
      <select id={id} className="h-10 w-full min-w-0 rounded-3xl border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" {...props}>
        {children}
      </select>
    </div>
  );
}
