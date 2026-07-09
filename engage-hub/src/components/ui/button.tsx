import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-bold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary: Bright gradient with glow effect and lift on hover
        default:
          "text-white font-bold bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] shadow-[0_0_15px_rgba(59,130,246,0.5)] hover:shadow-[0_0_25px_rgba(59,130,246,0.7)] hover:-translate-y-0.5 active:translate-y-0",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)]",
        // Outline with subtle violet tint and lift on hover
        outline:
          "border border-[#8B5CF6] bg-[rgba(139,92,246,0.1)] text-foreground hover:bg-[rgba(139,92,246,0.2)] hover:border-[#A78BFA] hover:-translate-y-0.5 hover:shadow-[0_0_12px_rgba(139,92,246,0.3)]",
        // Secondary: Semi-transparent violet with border
        secondary:
          "bg-[rgba(139,92,246,0.2)] border border-[#8B5CF6] text-foreground hover:bg-[rgba(139,92,246,0.35)] hover:-translate-y-0.5 hover:shadow-[0_0_12px_rgba(139,92,246,0.4)]",
        ghost:
          "hover:bg-accent/20 hover:text-accent-foreground hover:-translate-y-0.5",
        link:
          "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
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
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
