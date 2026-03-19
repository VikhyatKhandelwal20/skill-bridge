"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

type AccordionContextValue = {
  value: string | null;
  setValue: (next: string | null) => void;
  collapsible?: boolean;
};

const AccordionContext = React.createContext<AccordionContextValue | null>(
  null,
);

export function Accordion({
  children,
  defaultValue,
  collapsible = true,
}: {
  children: React.ReactNode;
  defaultValue?: string;
  collapsible?: boolean;
}) {
  const [value, setValue] = React.useState<string | null>(
    defaultValue ?? null,
  );

  const ctx = React.useMemo<AccordionContextValue>(
    () => ({ value, setValue, collapsible }),
    [value, collapsible],
  );

  return (
    <AccordionContext.Provider value={ctx}>
      <div className="w-full">{children}</div>
    </AccordionContext.Provider>
  );
}

export function AccordionItem({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  return <div data-accordion-item={value}>{children}</div>;
}

export function AccordionTrigger({
  children,
  value,
}: {
  children: React.ReactNode;
  value: string;
}) {
  const ctx = React.useContext(AccordionContext);
  if (!ctx) throw new Error("AccordionTrigger must be used within Accordion.");

  const isOpen = ctx.value === value;

  return (
    <button
      type="button"
      onClick={() => {
        if (isOpen) {
          ctx.setValue(ctx.collapsible ? null : value);
          return;
        }
        ctx.setValue(value);
      }}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
        "bg-zinc-900/40 hover:bg-zinc-900/60 border border-border/60",
      )}
      aria-expanded={isOpen}
    >
      <span className="text-zinc-200">{children}</span>
      <ChevronDown
        className={cn(
          "h-4 w-4 text-zinc-400 transition-transform",
          isOpen ? "rotate-180" : "rotate-0",
        )}
        aria-hidden
      />
    </button>
  );
}

export function AccordionContent({
  children,
  value,
}: {
  children: React.ReactNode;
  value: string;
}) {
  const ctx = React.useContext(AccordionContext);
  if (!ctx) throw new Error("AccordionContent must be used within Accordion.");

  const isOpen = ctx.value === value;

  return (
    <div
      data-accordion-content={value}
      className={cn(
        "overflow-hidden transition-[max-height,opacity] duration-300",
        isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0",
      )}
    >
      <div className="px-1 pb-2 pt-3">{children}</div>
    </div>
  );
}

