import Link from "next/link";
import { ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

const navItems = [
  { label: "About", href: "#about" },
  { label: "Tool", href: "#tool" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Skill-Bridge</span>
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            <span className="block text-xs text-muted-foreground">
              Career Navigator
            </span>
          </div>
        </div>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-foreground/80 transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:block">
          <Button asChild size="sm">
            <Link href="#tool">Start your path</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

