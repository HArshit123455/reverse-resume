"use client";

import { useCallback } from "react";
import { detectInlineCommand } from "./inline-commands";
import { useToast } from "../toast";
import { useEggs } from "../chrome-context";

export function useInlineCommands(onSubmit: (text: string) => void) {
  const toast = useToast();
  const { triggerLove } = useEggs();

  return useCallback(
    (text: string) => {
      const cmd = detectInlineCommand(text);
      if (cmd) {
        if (cmd.kind === "sudo") {
          toast.show(`> ${cmd.input}\n[sudo] permission granted. you're cool.`);
        } else if (cmd.kind === "whoami") {
          toast.show(
            "harshit · full-stack · uid=1337 · groups=builders, readers, listeners"
          );
        } else if (cmd.kind === "love") {
          triggerLove();
          toast.show(cmd.message, { variant: "love", durationMs: 7000 });
        }
        return;
      }
      onSubmit(text);
    },
    [onSubmit, toast, triggerLove]
  );
}
