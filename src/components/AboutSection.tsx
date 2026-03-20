import { ShieldCheck, Sparkles, WandSparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AboutSection() {
  return (
    <section id="about" className="scroll-mt-24 mx-auto max-w-6xl px-4 py-16">
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight">About & How it Works</h2>
          <p className="max-w-2xl text-sm text-foreground/80">
            Paste your resume text, pick a target role, then follow a chronological learning roadmap.
            Each roadmap step explicitly lists which skill gaps you unlock—no backend checklist needed.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="bg-card/70">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden />
                Step 1: Map skills
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-foreground/80">
              We extract core technical skills from your uploaded resume and
              temporarily cache them in your browser. This keeps the tool
              ultra-fast and ready to compare your profile against any role
              or custom job description.
            </CardContent>
          </Card>

          <Card className="bg-card/70">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <WandSparkles className="h-4 w-4 text-primary" aria-hidden />
                Step 2: Gap analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-foreground/80">
              We use semantic matching with prerequisite awareness (e.g., TCP/IP and Linux as foundations for advanced topics).
            </CardContent>
          </Card>

          <Card className="bg-card/70">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
                Step 3: Chronological roadmap
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-foreground/80">
              The roadmap interleaves foundational courses with curated, real-world
              lab projects. After each step,{" "}
              <span className="font-medium">achievedSkills</span> shows what you
              unlock next.
            </CardContent>
          </Card>
        </div>

        <div>
          <h3 className="text-xl font-semibold text-zinc-100 mt-12 mb-6">
            Featured Palo Alto Networks Tracks
          </h3>
          <p className="text-zinc-400 mb-6">
            Our platform natively integrates with industry-recognized
            certifications to guide your learning.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="bg-zinc-950 border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-900/80 transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-amber-500 text-sm font-semibold uppercase tracking-wider">
                Entry
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-semibold text-zinc-100">PCNSA</div>
              <div className="mt-1 text-xs text-zinc-400">
                Next-gen security fundamentals and core PANW terminology.
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950 border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-900/80 transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-amber-500 text-sm font-semibold uppercase tracking-wider">
                Specialist
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-semibold text-zinc-100">PCNSE</div>
              <div className="mt-1 text-xs text-zinc-400">
                Threat prevention, segmentation, and security policy mastery.
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950 border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-900/80 transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-amber-500 text-sm font-semibold uppercase tracking-wider">
                Architecture
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-semibold text-zinc-100">PCCET</div>
              <div className="mt-1 text-xs text-zinc-400">
                Design and validate enterprise-grade PANW solutions.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

