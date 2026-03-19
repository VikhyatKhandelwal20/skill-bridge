import { Hero } from "@/components/Hero";
import { Navbar } from "@/components/Navbar";
import { AboutSection } from "@/components/AboutSection";
import { ResumeUploadAndAnalyze } from "@/components/ResumeUploadAndAnalyze";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <AboutSection />
        <ResumeUploadAndAnalyze />
      </main>
    </div>
  );
}
