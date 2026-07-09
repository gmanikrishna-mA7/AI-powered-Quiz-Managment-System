import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        // Default: Gradient badge matching primary button
        default: "border-transparent bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] text-white shadow-[0_0_10px_rgba(59,130,246,0.4)] hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(59,130,246,0.6)]",
        // Secondary: Semi-transparent violet for tags like Easy, Medium, Hard
        secondary: "border-[#8B5CF6] bg-[rgba(139,92,246,0.2)] text-foreground hover:bg-[rgba(139,92,246,0.35)] hover:-translate-y-0.5 hover:shadow-[0_0_10px_rgba(139,92,246,0.4)]",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80 hover:-translate-y-0.5",
        outline: "text-foreground border-[#8B5CF6]/50 hover:border-[#8B5CF6] hover:bg-[rgba(139,92,246,0.1)] hover:-translate-y-0.5",
        // Difficulty variants
        easy: "border-emerald-500/50 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 hover:-translate-y-0.5",
        medium: "border-amber-500/50 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 hover:-translate-y-0.5",
        hard: "border-rose-500/50 bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 hover:-translate-y-0.5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
