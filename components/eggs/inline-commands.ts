import { detectLoveTrigger, type LoveTrigger } from "./use-love-triggers";

export type InlineCommand =
  | { kind: "sudo"; input: string }
  | { kind: "whoami" }
  | { kind: "love"; trigger: LoveTrigger; message: string };

const SUDO_RE = /^\s*sudo(?:\s|$)/i;
const WHOAMI_RE = /^\s*\/?whoami\s*$/i;

export function detectInlineCommand(text: string): InlineCommand | null {
  if (!text) return null;

  if (SUDO_RE.test(text)) {
    return { kind: "sudo", input: text };
  }
  if (WHOAMI_RE.test(text)) {
    return { kind: "whoami" };
  }
  const love = detectLoveTrigger(text);
  if (love) {
    return { kind: "love", trigger: love.trigger, message: love.message };
  }
  return null;
}
