"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface ToastOptions {
  durationMs?: number;
  variant?: "default" | "love";
}

interface ToastState {
  id: number;
  message: string;
  variant: "default" | "love";
}

interface ToastContextValue {
  show: (message: string, opts?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<number | null>(null);
  const idRef = useRef(0);

  const show = useCallback((message: string, opts: ToastOptions = {}) => {
    const id = ++idRef.current;
    setToast({ id, message, variant: opts.variant ?? "default" });
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const duration = opts.durationMs ?? 3200;
    timerRef.current = window.setTimeout(() => {
      setToast((cur) => (cur?.id === id ? null : cur));
      timerRef.current = null;
    }, duration);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <ToastSurface toast={toast} />
    </ToastContext.Provider>
  );
}

function ToastSurface({ toast }: { toast: ToastState | null }) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-0 bottom-[max(2rem,calc(env(safe-area-inset-bottom)+5.5rem))] z-[200] flex justify-center px-4 sm:bottom-10"
    >
      {toast ? (
        <div
          role="status"
          className={
            toast.variant === "love"
              ? "pointer-events-auto max-w-[min(520px,100%)] whitespace-pre-wrap rounded-[22px] bg-accent px-6 py-4 text-center text-[clamp(18px,2.2vw,22px)] font-semibold leading-snug tracking-[-0.02em] text-accent-ink"
              : "pointer-events-auto max-w-[480px] whitespace-pre-wrap rounded-pill bg-fg px-5 py-3 text-[15px] tracking-[-0.012em] text-bg"
          }
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}
