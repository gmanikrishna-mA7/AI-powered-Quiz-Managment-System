import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles
          "flex h-10 w-full rounded-md px-3 py-2 text-base md:text-sm",
          // Light mode: White bg, light border, dark text
          "bg-white border border-[#E2E8F0] text-[#1E293B]",
          "placeholder:text-[#64748B]",
          // Dark mode: Slate-800 bg, slate-600 border, white text
          "dark:bg-[#1E293B] dark:border-[#475569] dark:text-white",
          "dark:placeholder:text-[#94A3B8]",
          // Focus state with cyan glow (both modes)
          "focus:outline-none focus:border-[#60A5FA] focus:shadow-[0_0_0_2px_rgba(96,165,250,0.3)]",
          // Transition for smooth focus effect
          "transition-all duration-200",
          // Ring offset for accessibility
          "ring-offset-background",
          // File input styles
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          // Disabled state
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
