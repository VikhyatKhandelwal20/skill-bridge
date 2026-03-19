import { Hero } from "@/components/Hero";
import { Navbar } from "@/components/Navbar";
import { ResumeUploadAndAnalyze } from "@/components/ResumeUploadAndAnalyze";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <ResumeUploadAndAnalyze />
      </main>
    </div>
  );
}
