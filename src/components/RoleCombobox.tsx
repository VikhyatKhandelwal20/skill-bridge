"use client";

import * as React from "react";

import {
  Command,
  CommandEmpty,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export interface RoleOption {
  title: string;
}

export function RoleCombobox({
  options,
  value,
  onChange,
  placeholder = "Search roles...",
  disabled,
}: {
  options: RoleOption[];
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [query, setQuery] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.title.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <div className="relative">
      <label className="sr-only">Select a target role</label>
      <div className="flex items-center gap-2">
        <input
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="role-combobox-list"
          aria-autocomplete="list"
          value={query.length ? query : value}
          onChange={(e) => {
            if (disabled) return;
            setIsOpen(true);
            setQuery(e.target.value);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      {isOpen && !disabled && (
        <Command className="w-full">
          <CommandList>
            {filtered.length === 0 ? (
              <CommandEmpty>No roles found.</CommandEmpty>
            ) : (
              filtered.map((o) => (
                <CommandItem
                  key={o.title}
                  onSelect={() => {
                    onChange(o.title);
                    setIsOpen(false);
                    setQuery("");
                  }}
                >
                  {o.title}
                </CommandItem>
              ))
            )}
          </CommandList>
        </Command>
      )}
    </div>
  );
}

