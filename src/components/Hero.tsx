import { ArrowRight, BadgeCheck, Cpu, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
      >
        <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute right-[-6rem] top-[-5rem] h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-[-6rem] left-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-secondary/70 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:pt-20">
        <div className="grid items-start gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-4 py-2 text-xs text-muted-foreground backdrop-blur">
              <BadgeCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              Resume-to-role mapping for cybersecurity pathways
            </p>

            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Turn your resume into a{" "}
              <span className="text-primary">certified career plan</span>.
            </h1>

            <p className="max-w-xl text-pretty text-base leading-relaxed text-foreground/80 sm:text-lg">
              Skill-Bridge helps you identify the best-fit roles and a
              Palo-Alto-Networks-aligned certification track, with confidence
              scoring you can trust.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <a href="#get-started">
                  Get started
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#cert-tracks">Explore cert paths</a>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3" id="approach">
              <div className="rounded-lg border border-border/60 bg-card/70 p-4 backdrop-blur">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Shield className="h-4 w-4 text-primary" aria-hidden="true" />
                  Role Fit
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Match skills to target cybersecurity job families.
                </p>
              </div>

              <div className="rounded-lg border border-border/60 bg-card/70 p-4 backdrop-blur">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Cpu className="h-4 w-4 text-primary" aria-hidden="true" />
                  Evidence Based
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Confidence-scored findings from your resume text.
                </p>
              </div>

              <div
                className="rounded-lg border border-border/60 bg-card/70 p-4 backdrop-blur"
                id="palo-alto"
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Shield className="h-4 w-4 text-primary" aria-hidden="true" />
                  PANW Tracks
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Map your path to PCNSA/PCNSE/PCCET and beyond.
                </p>
              </div>
            </div>
          </div>

          <aside
            className="relative hidden w-full lg:block"
            aria-label="Preview card"
          >
            <div className="rounded-2xl border border-border/60 bg-card/70 p-6 backdrop-blur">
              <h2 className="text-sm font-semibold">What you get</h2>
              <ul className="mt-4 space-y-3 text-sm text-foreground/80">
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary">
                    1
                  </span>
                  Skills extraction with confidence score.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary">
                    2
                  </span>
                  Recommended cert track(s) to close gaps.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary">
                    3
                  </span>
                  A roadmap you can revisit as you grow.
                </li>
              </ul>

              <div className="mt-6 rounded-xl bg-secondary/70 p-4">
                <p className="text-xs text-muted-foreground">
                  Built for efficiency: resume analysis is cached by a
                  SHA-256 hash to avoid redundant LLM calls.
                </p>
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-3" id="cert-tracks">
          <div className="rounded-xl border border-border/60 bg-background/50 p-5">
            <p className="text-xs font-medium text-muted-foreground">
              Entry
            </p>
            <p className="mt-1 text-sm font-semibold">PCNSA</p>
            <p className="mt-2 text-xs text-foreground/70">
              Fundamentals of next-gen security and PANW terminology.
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/50 p-5">
            <p className="text-xs font-medium text-muted-foreground">
              Specialist
            </p>
            <p className="mt-1 text-sm font-semibold">PCNSE</p>
            <p className="mt-2 text-xs text-foreground/70">
              Advanced threat prevention, segmentation, and policy mastery.
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/50 p-5">
            <p className="text-xs font-medium text-muted-foreground">
              Architecture
            </p>
            <p className="mt-1 text-sm font-semibold">PCCET</p>
            <p className="mt-2 text-xs text-foreground/70">
              Design and validate PANW solutions for enterprise environments.
            </p>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-border/60 bg-card/70 p-6" id="get-started">
          <h2 className="text-lg font-semibold">Ready to map your next move?</h2>
          <p className="mt-2 max-w-2xl text-sm text-foreground/80">
            This MVP foundation sets up resume parsing, trusted Zod schemas,
            Groq-backed analysis with caching, and resilient UI error
            boundaries. The next step is wiring the upload + analysis flow.
          </p>
        </div>
      </div>
    </section>
  );
}

