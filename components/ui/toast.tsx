"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

type Toast = {
  id: string;
  title: string;
  description?: string;
  variant: "success" | "error";
};

type ToastContextValue = {
  toast: (toast: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((nextToast: Omit<Toast, "id">) => {
    const id = crypto.randomUUID();
    setToasts((items) => [...items, { ...nextToast, id }]);
    window.setTimeout(() => {
      setToasts((items) => items.filter((item) => item.id !== id));
    }, 4200);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-50 grid w-[min(380px,calc(100vw-2rem))] gap-3">
        {toasts.map((item) => {
          const Icon = item.variant === "success" ? CheckCircle2 : XCircle;
          return (
            <div
              key={item.id}
              className={`glass-panel rounded-md p-4 shadow-2xl ${
                item.variant === "success" ? "border-emerald-300/30" : "border-rose-300/30"
              }`}
            >
              <div className="flex gap-3">
                <Icon className={`mt-0.5 h-5 w-5 ${item.variant === "success" ? "text-emerald-300" : "text-rose-300"}`} />
                <div>
                  <p className="font-bold text-slate-100">{item.title}</p>
                  {item.description ? <p className="mt-1 text-sm text-slate-400">{item.description}</p> : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider.");
  }
  return context;
}
