import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group inline-flex h-10 items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-semibold tracking-wide transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400 text-white shadow-[0_0_28px_rgba(59,130,246,0.24)] hover:-translate-y-0.5 hover:shadow-[0_0_42px_rgba(59,130,246,0.42)]",
        secondary:
          "border border-violet-300/20 bg-violet-500/15 text-violet-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:-translate-y-0.5 hover:bg-violet-500/25 hover:shadow-[0_0_28px_rgba(139,92,246,0.28)]",
        outline:
          "border border-slate-600/50 bg-slate-950/40 text-slate-100 backdrop-blur hover:-translate-y-0.5 hover:border-blue-400/50 hover:bg-blue-500/10 hover:shadow-[0_0_28px_rgba(59,130,246,0.2)]",
        ghost: "text-slate-300 hover:bg-white/5 hover:text-white",
        destructive:
          "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-[0_0_24px_rgba(244,63,94,0.24)] hover:-translate-y-0.5"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-6"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
