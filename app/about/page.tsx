import type { Metadata } from "next";
import { loadAbout } from "@/lib/content/about";
import { loadExperience } from "@/lib/content/experience";
import { AboutHero, AboutNumbers } from "@/components/about/about-hero";
import { SectionHead } from "@/components/about/section-head";
import { LogoTimeline } from "@/components/about/logo-timeline";
import { SkillStack } from "@/components/about/skill-stack";
import { Achievements } from "@/components/about/achievements";
import { CtaCard } from "@/components/about/cta-card";
import { StageReveal } from "@/components/ui/stage-reveal";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "About — Harshit Sindhu",
  description:
    "Backend-heavy full-stack developer. Where I've worked, what I build, and how to reach me.",
};

export default function AboutPage() {
  const { data } = loadAbout();
  const experience = loadExperience();

  return (
    <>
      <main>
        <AboutHero data={data} />

        <div className="mx-auto max-w-[1120px] space-y-28 px-5 pb-24 sm:space-y-40 sm:px-8 sm:pb-32">
          <StageReveal>
            <AboutNumbers stats={data.stats} />
          </StageReveal>

          <section id="experience" className="scroll-mt-20">
            <StageReveal>
              <SectionHead title="Where I've worked." />
            </StageReveal>
            <StageReveal delay={80}>
              <LogoTimeline items={experience} />
            </StageReveal>
          </section>

          <section id="skills" className="scroll-mt-20">
            <StageReveal>
              <SectionHead title="What I work with." />
            </StageReveal>
            <StageReveal delay={80}>
              <SkillStack skills={data.skills} />
            </StageReveal>
          </section>

          {data.achievements.length > 0 ? (
            <section id="achievements" className="scroll-mt-20">
              <StageReveal>
                <SectionHead title="Along the way." />
              </StageReveal>
              <StageReveal delay={80}>
                <Achievements items={data.achievements} />
              </StageReveal>
            </section>
          ) : null}

          <StageReveal>
            <CtaCard data={data} />
          </StageReveal>
        </div>
      </main>
      <Footer />
    </>
  );
}
