"use client";

import * as React from "react";

export function Command({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className} role="application">
      {children}
    </div>
  );
}

export function CommandInput({
  value,
  onValueChange,
  placeholder,
  "aria-label": ariaLabel,
}: {
  value: string;
  onValueChange: (next: string) => void;
  placeholder?: string;
  "aria-label"?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    />
  );
}

export function CommandList({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 max-h-56 overflow-auto rounded-md border border-border/60 bg-zinc-900/40 p-1">
      {children}
    </div>
  );
}

export function CommandEmpty({ children }: { children: React.ReactNode }) {
  return <div className="px-2 py-2 text-sm text-muted-foreground">{children}</div>;
}

export function CommandItem({
  children,
  onSelect,
}: {
  children: React.ReactNode;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full rounded-sm px-2 py-2 text-left text-sm text-zinc-100 hover:bg-zinc-800/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      {children}
    </button>
  );
}

