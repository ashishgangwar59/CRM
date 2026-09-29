import * as React from "react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: string;
  size?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
          variant === 'outline' ? 'border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:bg-transparent dark:text-zinc-100 dark:hover:bg-zinc-800' :
          variant === 'destructive' ? 'bg-rose-600 text-white hover:bg-rose-700' :
          variant === 'ghost' ? 'hover:bg-zinc-100 dark:hover:bg-zinc-800' :
          'bg-[#134086] text-white hover:bg-[#0f336c]',
          size === 'icon' ? 'h-10 w-10' :
          size === 'sm' ? 'h-9 px-3' :
          size === 'lg' ? 'h-11 px-8' :
          'h-10 px-4 py-2',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
