import { LoaderIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <LoaderIcon
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
}

/** Centered, full-area loading state — vertically + horizontally centered. */
export function PageSpinner() {
  return (
    <div className="flex min-h-[80dvh] w-full items-center justify-center">
      <Spinner className="size-12 text-muted-foreground" />
    </div>
  );
}
