"use client"

import React, {
  useMemo,
  type ComponentPropsWithoutRef,
} from "react"
import { AnimatePresence, motion, type MotionProps } from "motion/react"

import { cn } from "@/lib/utils"

export function AnimatedListItem({ children, isTable, delayIndex = 0 }: { children: React.ReactNode, isTable?: boolean, delayIndex?: number }) {
  const animations: MotionProps = {
    initial: { scale: 0.95, opacity: 0, y: 15 },
    animate: { scale: 1, opacity: 1, y: 0, originY: 0 },
    exit: { scale: 0.95, opacity: 0, y: -15 },
    transition: { type: "spring", stiffness: 350, damping: 40, delay: delayIndex * 0.04 },
  }

  if (isTable && React.isValidElement(children)) {
    const Component = motion.tr;
    return (
      <Component {...animations} layout className={children.props.className}>
        {children.props.children}
      </Component>
    )
  }

  return (
    <motion.div {...animations} layout className="mx-auto w-full">
      {children}
    </motion.div>
  )
}

export interface AnimatedListProps extends ComponentPropsWithoutRef<"div"> {
  children: React.ReactNode
  delay?: number
  isTable?: boolean
}

export const AnimatedList = React.memo(
  ({ children, className, delay = 0, isTable = false, ...props }: AnimatedListProps) => {

    const childrenArray = useMemo(
      () => React.Children.toArray(children),
      [children]
    )

    if (isTable) {
      return (
        <tbody className={cn(className)} {...(props as any)}>
          <AnimatePresence>
            {childrenArray.map((item, idx) => (
              <AnimatedListItem isTable key={(item as React.ReactElement).key || idx} delayIndex={idx}>
                {item}
              </AnimatedListItem>
            ))}
          </AnimatePresence>
        </tbody>
      )
    }

    return (
      <div
        className={cn(`flex flex-col items-center gap-4`, className)}
        {...props}
      >
        <AnimatePresence>
          {childrenArray.map((item, idx) => (
            <AnimatedListItem key={(item as React.ReactElement).key || idx} delayIndex={idx}>
              {item}
            </AnimatedListItem>
          ))}
        </AnimatePresence>
      </div>
    )
  }
)

AnimatedList.displayName = "AnimatedList"
