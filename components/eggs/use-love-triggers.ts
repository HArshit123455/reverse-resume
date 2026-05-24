export const LOVE_TRIGGERS = [
  "mumma",
  "papa",
  "didi",
  "doraemon",
  "laal mirch",
  "love",
  "love you",
  "miss you",
  "harshit❤",
] as const;

export type LoveTrigger = (typeof LOVE_TRIGGERS)[number];

export const LOVE_MESSAGES: Record<string, string> = {
  "mumma": "Hi Mumma. He loves you.",
  "papa": "Hi Papa. He's working hard.",
  "didi": "Hi Didi. He misses you.",
  "doraemon": "Hi Doraemon, Muaahh bby.",
  "laal mirch": "Laal mirch ka Kaala jaadu, hehe.",
  "miss you": "He misses you too.",
  "love": "Loved right back.",
  "love you": "Loved right back.",
  "harshit❤": "Caught you smiling. Take a break — the code's not going anywhere.",
};

const FALLBACK = "For you, with love. ♥";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const TRIGGERS_BY_LENGTH = [...LOVE_TRIGGERS].sort((a, b) => b.length - a.length);

const BOUNDARY = "(?:^|[\\s!.?,;:])";
const BOUNDARY_END = "(?=$|[\\s!.?,;:])";

export interface LoveMatch {
  trigger: LoveTrigger;
  message: string;
}

export function detectLoveTrigger(text: string): LoveMatch | null {
  if (!text) return null;
  for (const trigger of TRIGGERS_BY_LENGTH) {
    const pattern = new RegExp(`${BOUNDARY}${escapeRegex(trigger)}${BOUNDARY_END}`, "i");
    if (pattern.test(text)) {
      return {
        trigger: trigger as LoveTrigger,
        message: LOVE_MESSAGES[trigger] ?? FALLBACK,
      };
    }
  }
  return null;
}
