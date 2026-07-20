import * as React from "react";
import { cn } from "@/lib/utils";

/** Styled native select — enough for the admin console's simple pickers. */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "h-9 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60",
      className,
    )}
    {...props}
  />
));
Select.displayName = "Select";
