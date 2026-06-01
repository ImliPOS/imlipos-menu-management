import * as React from "react";
import { cn } from "@/lib/utils";

export function Item({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "outline" }) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-lg p-4",
        variant === "outline" && "border border-border bg-card",
        className,
      )}
      {...props}
    />
  );
}

export function ItemMedia({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "icon" }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center text-foreground [&_svg]:size-5",
        variant === "icon" && "h-9 w-9 rounded-md",
        className,
      )}
      {...props}
    />
  );
}

export function ItemContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex min-w-0 flex-col gap-0.5", className)} {...props} />;
}

export function ItemTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("font-medium text-foreground", className)} {...props} />;
}

export function ItemDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function ItemActions({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("ml-auto flex items-center gap-2", className)} {...props} />;
}
