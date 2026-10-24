"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useTransform,
} from "motion/react"

interface Position {
  /** The x coordinate of the lens */
  x: number
  /** The y coordinate of the lens */
  y: number
}

interface LensProps {
  /** The children of the lens */
  children: React.ReactNode
  /** The zoom factor of the lens */
  zoomFactor?: number
  /** The size of the lens */
  lensSize?: number
  /** The position of the lens */
  position?: Position
  /** The default position of the lens */
  defaultPosition?: Position
  /** Whether the lens is static */
  isStatic?: boolean
  /** The duration of the animation */
  duration?: number
  /** The color of the lens */
  lensColor?: string
  /** The localized aria label of the lens */
  ariaLabel: string
}

export function Lens({
  children,
  zoomFactor = 1.3,
  lensSize = 170,
  isStatic = false,
  position = { x: 0, y: 0 },
  defaultPosition,
  duration = 0.1,
  lensColor = "black",
  ariaLabel,
}: LensProps) {
  if (zoomFactor < 1) {
    throw new Error("zoomFactor must be greater than 1")
  }
  if (lensSize < 0) {
    throw new Error("lensSize must be greater than 0")
  }

  const [isHovering, setIsHovering] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // The pointer lives in motion values, not React state. Magic UI's version
  // set state on every mousemove, which re-rendered the whole magnified copy
  // of the stage per event; here a move only rewrites the mask, the zoom
  // origin and the rim's transform.
  const pointerX = useMotionValue(position.x)
  const pointerY = useMotionValue(position.y)

  // Where the lens rests when the pointer is not driving it.
  const resting = isStatic ? position : defaultPosition && !isHovering ? defaultPosition : null
  const restX = resting?.x
  const restY = resting?.y
  useEffect(() => {
    if (restX === undefined || restY === undefined) return
    pointerX.set(restX)
    pointerY.set(restY)
  }, [restX, restY, pointerX, pointerY])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isStatic) return
      const rect = e.currentTarget.getBoundingClientRect()
      pointerX.set(e.clientX - rect.left)
      pointerY.set(e.clientY - rect.top)
    },
    [isStatic, pointerX, pointerY]
  )

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") setIsHovering(false)
  }, [])

  const maskImage = useMotionTemplate`radial-gradient(circle ${
    lensSize / 2
  }px at ${pointerX}px ${pointerY}px, ${lensColor} 100%, transparent 100%)`
  const zoomOrigin = useMotionTemplate`${pointerX}px ${pointerY}px`
  // The rim moves by transform from the corner rather than by `left`/`top`.
  const rimX = useTransform(pointerX, (value) => value - lensSize / 2)
  const rimY = useTransform(pointerY, (value) => value - lensSize / 2)

  const lensContent = (
    <React.Fragment key="lens">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration }}
        aria-hidden
        inert
        className="absolute inset-0 overflow-hidden"
        style={{ maskImage, WebkitMaskImage: maskImage, zIndex: 1 }}
      >
        <motion.div
          className="absolute inset-0"
          style={{ scale: zoomFactor, transformOrigin: zoomOrigin }}
        >
          {children}
        </motion.div>
      </motion.div>
      {/* The rim, outside the masked layer so its edge is not clipped: without
       * it the magnified circle reads as a double exposure of the page. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration }}
        aria-hidden
        data-lens-rim=""
        className="pointer-events-none absolute left-0 top-0 rounded-full border border-hairline-strong shadow-[0_8px_24px_-12px_color-mix(in_oklab,var(--ink)_35%,transparent)]"
        style={{ width: lensSize, height: lensSize, x: rimX, y: rimY, zIndex: 2 }}
      />
    </React.Fragment>
  )

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseMove={handleMouseMove}
      onKeyDown={handleKeyDown}
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
    >
      {children}
      {isStatic || defaultPosition ? (
        lensContent
      ) : (
        <AnimatePresence>{isHovering && lensContent}</AnimatePresence>
      )}
    </div>
  )
}
