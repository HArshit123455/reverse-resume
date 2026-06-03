import type { Metadata } from "next";
import { loadAbout } from "@/lib/content/about";
import { loadExperience } from "@/lib/content/experience";
import { AboutHero } from "@/components/about/about-hero";
import { SectionHead } from "@/components/about/section-head";
import { LogoTimeline } from "@/components/about/logo-timeline";
import { SkillStack } from "@/components/about/skill-stack";
import { Achievements } from "@/components/about/achievements";
import { CtaCard } from "@/components/about/cta-card";
import { Reveal } from "@/components/about/reveal";
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
    <div className="mx-auto w-full max-w-[1040px]">
      <AboutHero data={data} />

      <Reveal>
        <section id="experience" className="scroll-mt-20 pt-[84px]">
          <SectionHead num="01" title="Experience & education" />
          <LogoTimeline items={experience} />
        </section>
      </Reveal>

      <Reveal>
        <section id="skills" className="scroll-mt-20 pt-[84px]">
          <SectionHead num="02" title="What I work with" />
          <SkillStack skills={data.skills} />
        </section>
      </Reveal>

      {data.achievements.length > 0 ? (
        <Reveal>
          <section id="achievements" className="scroll-mt-20 pt-[84px]">
            <SectionHead num="03" title="Achievements" />
            <Achievements items={data.achievements} />
          </section>
        </Reveal>
      ) : null}

      <Reveal>
        <CtaCard data={data} />
      </Reveal>

      <Footer />
    </div>
  );
}
