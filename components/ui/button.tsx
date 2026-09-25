import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-[15px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine-700 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-pine-900 text-white hover:bg-pine-800",
        white: "bg-white text-pine-950 hover:bg-teal-50",
        outlineDark: "border border-white/30 text-white hover:bg-white/10",
        outline: "border border-pine-900/25 bg-white text-pine-900 hover:bg-pine-50",
        whatsapp: "bg-[#1FA855] text-white hover:bg-[#178a45]",
        ghost: "text-pine-900 hover:bg-pine-50",
        link: "text-pine-800 underline decoration-pine-700/25 underline-offset-4 hover:decoration-pine-700",
      },
      size: {
        default: "px-6 py-3.5",
        sm: "px-4 py-2.5 text-[14px]",
        lg: "px-7 py-4 text-[16px]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
