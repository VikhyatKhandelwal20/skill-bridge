"use client";

import * as React from "react";

import {
  Command,
  CommandEmpty,
  CommandInput,
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
  placeholder = "Select a role…",
  disabled,
}: {
  options: RoleOption[];
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [roleSearchQuery, setRoleSearchQuery] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);

  const filteredRoles = React.useMemo(() => {
    const q = roleSearchQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter((job) =>
      job.title.toLowerCase().includes(q),
    );
  }, [options, roleSearchQuery]);

  return (
    <div className="relative">
      <label className="sr-only">Select a target role</label>
      <button
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls="role-combobox-list"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value || placeholder}
        </span>
      </button>

      {isOpen && !disabled && (
        <Command className="absolute z-50 mt-1 w-full rounded-md border border-border/60 bg-card p-2 shadow-md">
          <CommandInput
            value={roleSearchQuery}
            onValueChange={setRoleSearchQuery}
            placeholder="Search roles..."
            aria-label="Search roles"
          />
          <div id="role-combobox-list" role="listbox">
            <CommandList>
              {filteredRoles.length === 0 ? (
                <CommandEmpty>No roles found.</CommandEmpty>
              ) : (
                filteredRoles.map((o) => (
                  <CommandItem
                    key={o.title}
                    onSelect={() => {
                      onChange(o.title);
                      setIsOpen(false);
                      setRoleSearchQuery("");
                    }}
                  >
                    {o.title}
                  </CommandItem>
                ))
              )}
            </CommandList>
          </div>
        </Command>
      )}
    </div>
  );
}
