"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

type ToastVariant = "default" | "positive" | "error";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  toast: (
    message: string,
    opts?: { variant?: ToastVariant; action?: ToastItem["action"] }
  ) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback(
    (
      message: string,
      opts?: { variant?: ToastVariant; action?: ToastItem["action"] }
    ) => {
      const id = nextId++;
      setToasts((prev) => [
        ...prev,
        { id, message, variant: opts?.variant ?? "default", action: opts?.action },
      ]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    []
  );

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`qh-toast pointer-events-auto ${
              t.variant === "positive"
                ? "qh-toast--positive"
                : t.variant === "error"
                  ? "qh-toast--error"
                  : ""
            }`}
          >
            <span className="qh-toast__mark" />
            <span className="qh-toast__msg">{t.message}</span>
            {t.action && (
              <button
                type="button"
                className="qh-toast__action"
                onClick={t.action.onClick}
              >
                {t.action.label}
              </button>
            )}
            <button
              type="button"
              className="qh-iconbtn"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss message"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round">
                <line x1="5" y1="5" x2="15" y2="15" />
                <line x1="15" y1="5" x2="5" y2="15" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
