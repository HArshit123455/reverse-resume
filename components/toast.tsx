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
      className="pointer-events-none fixed inset-x-0 bottom-8 z-[200] flex justify-center px-4"
    >
      {toast ? (
        <div
          role="status"
          className={
            toast.variant === "love"
              ? "pointer-events-auto max-w-[480px] whitespace-pre-wrap rounded-[14px] border border-border bg-bg-elev px-5 py-3 font-serif text-[15.5px] italic text-accent shadow-md"
              : "pointer-events-auto max-w-[480px] whitespace-pre-wrap rounded-[14px] border border-border bg-bg-elev px-5 py-3 font-mono text-[12.5px] text-fg-soft shadow-md"
          }
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}
