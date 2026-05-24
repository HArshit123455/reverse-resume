"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { CommandPalette } from "./palette/command-palette";
import { ToastProvider, useToast } from "./toast";
import { PaletteContext, EggsContext } from "./chrome-context";
import { useKonami } from "./eggs/use-konami";
import { detectLoveTrigger } from "./eggs/use-love-triggers";
import type { Audience } from "@/lib/sse";

const SparkleOverlay = dynamic(() => import("./eggs/sparkle-overlay"), { ssr: false });
const LoveOverlay = dynamic(() => import("./eggs/love-overlay"), { ssr: false });
const MatrixOverlay = dynamic(() => import("./eggs/matrix-overlay"), { ssr: false });

const HIDDEN_JOKES = [
  "Two SSE streams walk into a bar. The bartender says, why so chunky?",
  "I told my code to be more independent. Now it has its own opinions.",
  "There are 10 kinds of devs: those who write tests and those who debug in prod.",
];

const HIDDEN_CREDITS =
  "Built by Harshit. Powered by curiosity, RAG, and one extra coffee.";

function persistAudience(a: Audience) {
  try {
    window.localStorage.setItem("rr_audience", a);
  } catch {
    // ignore
  }
}

function prefersReducedMotion(): boolean {
  return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}

function ChromeInner({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sparkle, setSparkle] = useState(false);
  const [love, setLove] = useState(false);
  const [matrix, setMatrix] = useState(false);
  const toast = useToast();

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  const triggerSparkle = useCallback(() => {
    if (prefersReducedMotion()) {
      toast.show("✦ konami ✦ — sparkle (motion off)");
      return;
    }
    setSparkle(true);
  }, [toast]);

  const triggerLove = useCallback(() => {
    if (prefersReducedMotion()) return;
    setLove(true);
  }, []);

  const triggerMatrix = useCallback(() => {
    if (prefersReducedMotion()) {
      toast.show("> entering the matrix… (motion off)");
      return;
    }
    setMatrix(true);
  }, [toast]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((cur) => !cur);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onKonami = useCallback(() => {
    triggerSparkle();
    toast.show("✦ konami ✦ unlocked");
  }, [triggerSparkle, toast]);

  useKonami(onKonami);

  function fireCommand(id: string) {
    closePalette();
    switch (id) {
      case "nav.ask": {
        const input = document.querySelector<HTMLTextAreaElement>(
          'textarea[placeholder*="Ask"]'
        );
        input?.focus();
        input?.scrollIntoView?.({ behavior: "smooth", block: "center" });
        return;
      }
      case "nav.work":
        document.getElementById("work")?.scrollIntoView({ behavior: "smooth" });
        return;
      case "nav.now":
        document.getElementById("now")?.scrollIntoView({ behavior: "smooth" });
        return;
      case "nav.footer":
        document.getElementById("footer")?.scrollIntoView({ behavior: "smooth" });
        return;
      case "audience.curious":
      case "audience.recruiter":
      case "audience.engineer": {
        const audience = id.split(".")[1] as Audience;
        persistAudience(audience);
        toast.show(`Audience → ${audience}. Reloading…`);
        window.setTimeout(() => window.location.reload(), 600);
        return;
      }
      case "connect.linkedin":
        window.open(
          "https://www.linkedin.com/in/harshit-sindhu/",
          "_blank",
          "noopener,noreferrer"
        );
        return;
      case "connect.github":
        window.open(
          "https://github.com/HArshit123455",
          "_blank",
          "noopener,noreferrer"
        );
        return;
      case "connect.gitlab":
        window.open(
          "https://gitlab.com/harshit_sindhu",
          "_blank",
          "noopener,noreferrer"
        );
        return;
      case "connect.email":
        window.location.href = "mailto:harshitsindhu10@gmail.com";
        return;
      case "settings.theme": {
        const cur = document.documentElement.getAttribute("data-theme");
        const next = cur === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        try {
          window.localStorage.setItem("theme", next);
        } catch {
          // ignore
        }
        return;
      }
      case "settings.resume":
        window.open("/resume.pdf", "_blank", "noopener,noreferrer");
        return;
      case "hidden.love": {
        const msg = detectLoveTrigger("love")?.message ?? "For you, with love. ♥";
        triggerLove();
        toast.show(msg, { variant: "love", durationMs: 7000 });
        return;
      }
      case "hidden.joke": {
        const joke = HIDDEN_JOKES[Math.floor(Math.random() * HIDDEN_JOKES.length)];
        toast.show(joke);
        return;
      }
      case "hidden.konami":
        triggerSparkle();
        toast.show("✦ konami ✦ unlocked");
        return;
      case "hidden.matrix":
        triggerMatrix();
        return;
      case "hidden.credits":
        toast.show(HIDDEN_CREDITS, { durationMs: 5000 });
        return;
    }
  }

  return (
    <PaletteContext.Provider
      value={{ isOpen: paletteOpen, open: openPalette, close: closePalette }}
    >
      <EggsContext.Provider value={{ triggerSparkle, triggerLove, triggerMatrix }}>
        {children}
        <CommandPalette open={paletteOpen} onClose={closePalette} onFire={fireCommand} />
        {sparkle ? <SparkleOverlay onDone={() => setSparkle(false)} /> : null}
        {love ? <LoveOverlay onDone={() => setLove(false)} /> : null}
        {matrix ? <MatrixOverlay onDone={() => setMatrix(false)} /> : null}
      </EggsContext.Provider>
    </PaletteContext.Provider>
  );
}

export function Chrome({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ChromeInner>{children}</ChromeInner>
    </ToastProvider>
  );
}
