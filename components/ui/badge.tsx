import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-semibold",
  {
    variants: {
      variant: {
        pine: "border-pine-900/15 bg-pine-50 text-pine-800",
        dark: "border-white/20 bg-white/10 text-white",
        outline: "border-pine-950/15 bg-white text-stone-600",
      },
    },
    defaultVariants: { variant: "pine" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
