"use client"

import { useReducedMotion as useMotionReducedMotion } from "motion/react"
import { useHasMounted } from "./use-has-mounted"

/** Keep server and first client markup identical before applying the browser preference. */
export function useReducedMotion(): boolean {
  const reduced = useMotionReducedMotion()
  const mounted = useHasMounted()
  return mounted && Boolean(reduced)
}
