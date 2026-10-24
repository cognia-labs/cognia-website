import { type ComponentPropsWithoutRef, type ReactNode } from "react"

import { cn } from "@web/lib/utils"

interface BentoGridProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode
  className?: string
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
  return (
    <div
      className={cn("grid w-full grid-flow-dense grid-cols-1 gap-px bg-hairline", className)}
      data-slot="bento-grid"
      {...props}
    >
      {children}
    </div>
  )
}

export { BentoGrid }
