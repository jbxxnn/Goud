import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-gray-400 selection:bg-primary selection:text-primary-foreground dark:bg-input/30 h-12 w-full min-w-0 rounded-md border-2 border-primary-foreground bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "ring-0 focus:ring-0 focus:ring-offset-0 focus:border-primary-foreground focus-visible:border-primary-foreground focus-visible:ring-0 focus-visible:ring-offset-0",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      style={{ borderRadius: '0.5rem' }}
      {...props}
    />
  )
}

export { Input }
