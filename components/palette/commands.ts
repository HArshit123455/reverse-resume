export type CommandSection =
  | "Navigate"
  | "Audience"
  | "Connect"
  | "Settings"
  | "Hidden";

export interface Command {
  id: string;
  label: string;
  kbd?: string;
  section: CommandSection;
  keywords?: string[];
  hidden?: boolean;
}

export const SECTION_ORDER: CommandSection[] = [
  "Navigate",
  "Audience",
  "Connect",
  "Settings",
  "Hidden",
];

export const COMMAND_CATALOG: Command[] = [
  { id: "nav.ask", label: "Ask…", kbd: "↩", section: "Navigate" },
  { id: "nav.work", label: "Jump to Work", kbd: "W", section: "Navigate", keywords: ["projects"] },
  { id: "nav.now", label: "Jump to Now", kbd: "N", section: "Navigate" },
  { id: "nav.footer", label: "Jump to Footer", kbd: "↓", section: "Navigate", keywords: ["contact"] },

  { id: "audience.curious", label: "Switch view → Curious", kbd: "1", section: "Audience" },
  { id: "audience.recruiter", label: "Switch view → Recruiter", kbd: "2", section: "Audience" },
  { id: "audience.engineer", label: "Switch view → Engineer", kbd: "3", section: "Audience" },

  { id: "connect.linkedin", label: "LinkedIn", section: "Connect" },
  { id: "connect.github", label: "GitHub", section: "Connect" },
  { id: "connect.gitlab", label: "GitLab", section: "Connect" },
  { id: "connect.email", label: "Email", section: "Connect" },

  { id: "settings.theme", label: "Toggle theme", kbd: "T", section: "Settings" },
  { id: "settings.resume", label: "Download résumé", kbd: "R", section: "Settings" },

  { id: "hidden.love", label: "For someone you love ♥", section: "Hidden", hidden: true, keywords: ["love", "heart", "mumma", "papa"] },
  { id: "hidden.joke", label: "Tell me a joke", section: "Hidden", hidden: true, keywords: ["joke", "funny", "haha"] },
  { id: "hidden.konami", label: "Activate Konami mode", section: "Hidden", hidden: true, keywords: ["konami", "sparkle", "cheat"] },
  { id: "hidden.matrix", label: "Enter the Matrix", section: "Hidden", hidden: true, keywords: ["matrix", "neo", "rain"] },
  { id: "hidden.credits", label: "Roll the credits", section: "Hidden", hidden: true, keywords: ["credits", "thanks"] },
];

export function filterCommands(catalog: Command[], query: string): Command[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return catalog.filter((c) => !c.hidden);
  }
  return catalog.filter((c) => {
    const haystack = [c.label, ...(c.keywords ?? [])].join(" ").toLowerCase();
    return haystack.includes(q);
  });
}
