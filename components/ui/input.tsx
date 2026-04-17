import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-11 w-full rounded-md border border-slate-700/70 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 outline-none ring-offset-background transition-all duration-300 placeholder:text-slate-500 focus:border-blue-400/70 focus:bg-slate-950/70 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12),0_0_24px_rgba(59,130,246,0.14)] disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
