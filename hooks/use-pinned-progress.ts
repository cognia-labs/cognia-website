"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/** Below this the section is never pinned. See {@link usePinnedProgress}. */
export const PIN_MIN_WIDTH = 1024

/** Below this height the complete pinned stage cannot remain legible. */
export const PIN_MIN_HEIGHT = 640

/**
 * How far the reader scrolls, in `dvh`, to advance one step.
 *
 * Under half a screen: long enough to read each state, short enough that the
 * section never strands the reader inside several mostly empty screens.
 */
export const TRAVEL_PER_STEP_DVH = 45

/**
 * Which step a scroll position lands on.
 *
 * Exported and pure so the arithmetic is testable without a layout engine —
 * jsdom reports every rect as zero, so a hook-level test could never exercise
 * this. Same split as `pickActive` in `use-section-progress.ts`.
 *
 * `offset` is how far the sticky stage has slid down inside its wrapper, and
 * `travel` is how far it can slide: the wrapper's height less the stage's own.
 * The stage is only as tall as its content, so the section neither opens nor
 * closes on a viewport of empty paper around a centred panel; the travel is a
 * spacer under it, and the stage's offset over that spacer is the progress.
 */
export function indexFromOffset(offset: number, travel: number, steps: number): number {
  if (steps <= 1 || travel <= 0) return 0
  const progress = Math.min(Math.max(offset / travel, 0), 1)
  // `steps - 1` bands rather than `steps`: progress 1 must land on the last
  // step, and flooring `progress * steps` only reaches it exactly at 1.0, which
  // sub-pixel scroll positions never quite hit.
  return Math.min(Math.round(progress * (steps - 1)), steps - 1)
}

/**
 * Scroll offset that makes `index` the active step.
 *
 * While pinned the stage sits at `stickyTop` in the viewport, so its offset in
 * the wrapper is `stickyTop - (wrapperTop - scrollY)`; solving that for the
 * offset `index` needs gives the scroll position.
 */
export function scrollTopForIndex(
  wrapperTopInDocument: number,
  travel: number,
  stickyTop: number,
  steps: number,
  index: number
): number {
  if (steps <= 1 || travel <= 0) return Math.max(wrapperTopInDocument - stickyTop, 0)
  const fraction = Math.min(Math.max(index, 0), steps - 1) / (steps - 1)
  return Math.max(wrapperTopInDocument + travel * fraction - stickyTop, 0)
}

/** The stage and the travel it slides over, read from the wrapper's layout. */
function measureStage(wrapper: HTMLElement) {
  const stage = wrapper.firstElementChild as HTMLElement | null
  const outer = wrapper.getBoundingClientRect()
  if (!stage) return { offset: 0, travel: 0, stickyTop: 0, wrapperTop: outer.top }
  const inner = stage.getBoundingClientRect()
  return {
    offset: inner.top - outer.top,
    travel: outer.height - inner.height,
    stickyTop: Number.parseFloat(window.getComputedStyle(stage).top) || 0,
    wrapperTop: outer.top,
  }
}

interface UsePinnedProgressOptions {
  /** How many steps the section advances through. */
  steps: number
  /**
   * Caller-controlled kill switch — pass `false` under
   * `prefers-reduced-motion`. Spec §6.3 forbids pin, scrub and autoplay in that
   * mode outright; this is not a shortened version of the effect, it is none of
   * it.
   */
  enabled: boolean
}

interface PinnedProgress {
  wrapperRef: React.RefObject<HTMLDivElement | null>
  /** Active step, derived from scroll position. `0` while unpinned. */
  index: number
  /**
   * Whether pinning is live. `false` on the server, on the first client render,
   * under reduced motion, and below the desktop width/height floor — so the
   * caller can render its ordinary layout in every one of those cases.
   *
   * The wrapper's first child is the sticky stage; whatever follows it is the
   * travel the reader scrolls through while the stage holds.
   */
  pinned: boolean
  /** Scroll so `index` becomes the active step. Keeps the controls working. */
  scrollToIndex: (index: number) => void
}

/**
 * Scroll-pinned progress: the section holds the viewport while its content
 * advances, then releases.
 *
 * This is the site's one pinned surface (spec §6.6). Two implementation choices
 * are load-bearing:
 *
 * **Native scrolling is never intercepted.** The effect is a tall wrapper with
 * a `position: sticky` child; this hook only *reads* where the page already is.
 * Nothing listens for `wheel` or `touchmove`, so scroll speed, momentum,
 * keyboard paging, Find-in-page and the scrollbar all keep working, and a
 * reader who wants past the section can simply scroll faster. Scroll-jacking
 * would have broken all of those.
 *
 * **Pinning is off below `lg`.** Mobile browsers change viewport height as
 * their chrome hides and shows, which silently rewrites the travel distance
 * mid-scroll; and spec §7 wants one primary visual per screen on mobile
 * anyway.
 *
 * Under `prefers-reduced-motion` the caller passes `enabled: false` and this
 * returns `pinned: false` forever — no tall wrapper is rendered, so there is
 * nothing to scroll through.
 */
export function usePinnedProgress({ steps, enabled }: UsePinnedProgressOptions): PinnedProgress {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [index, setIndex] = useState(0)
  // Starts `false` on purpose: the server and the first client render must
  // agree, and the server cannot know the viewport width. Pinning switches on
  // in the effect below, after hydration.
  const [pinned, setPinned] = useState(false)

  useEffect(() => {
    // Nothing to subscribe to when disabled. The disabled result is *derived*
    // at the return below rather than written back into state here: a
    // synchronous `setState` in an effect body cascades an extra render, and
    // `enabled` is already authoritative.
    if (!enabled) return
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return

    const query = window.matchMedia(
      `(min-width: ${PIN_MIN_WIDTH}px) and (min-height: ${PIN_MIN_HEIGHT}px)`
    )
    let frame = 0

    const measure = () => {
      frame = 0
      // `query.matches` is re-read here, not just in the `change` handler.
      // Relying on the event alone leaves the component pinned whenever a
      // resize path does not dispatch it — which is not hypothetical: viewport
      // emulation resizes the page without firing `change`, and a stale pin
      // means a tall travel wrapper and a `100dvh` panel on a phone-width
      // screen. Reconciling on every scroll and resize makes the event an
      // optimisation rather than the only source of truth.
      const active = query.matches
      setPinned(active)
      if (!active) {
        setIndex(0)
        return
      }
      const node = wrapperRef.current
      if (!node) return
      const { offset, travel } = measureStage(node)
      setIndex(indexFromOffset(offset, travel, steps))
    }

    const schedule = () => {
      // rAF-throttled rather than raw: a scroll handler that calls
      // `getBoundingClientRect` on every event forces a layout per event.
      if (frame) return
      frame = window.requestAnimationFrame(measure)
    }

    // Scrolling elsewhere on the page has nothing to measure. While the
    // section is more than a screen away the handler returns at once; the
    // observer measures once more on the way out, so the index settles on the
    // step the reader left it at, and again on the way back in.
    let near = true
    const node = wrapperRef.current
    const observer =
      node && typeof IntersectionObserver === "function"
        ? new IntersectionObserver(
            (entries) => {
              near = entries.some((entry) => entry.isIntersecting)
              schedule()
            },
            { rootMargin: "100% 0px" }
          )
        : null
    if (node) observer?.observe(node)

    const onScroll = () => {
      if (near) schedule()
    }
    const apply = () => measure()

    apply()
    query.addEventListener("change", apply)
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", schedule)

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      observer?.disconnect()
      query.removeEventListener("change", apply)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", schedule)
    }
  }, [enabled, steps])

  const scrollToIndex = useCallback(
    (next: number) => {
      const node = wrapperRef.current
      if (!node || typeof window === "undefined") return
      const { travel, stickyTop, wrapperTop } = measureStage(node)
      window.scrollTo({
        top: scrollTopForIndex(wrapperTop + window.scrollY, travel, stickyTop, steps, next),
        // An explicit `behavior` ignores the CSS `scroll-behavior` belt, so
        // this is only safe because pinning never runs under reduced motion.
        behavior: "smooth",
      })
    },
    [steps]
  )

  // `enabled: false` (reduced motion) must read exactly like "never pinned,
  // first step", and re-enabling re-runs the effect, whose `apply()` writes
  // both values back before the next paint.
  return {
    wrapperRef,
    index: enabled ? index : 0,
    pinned: enabled && pinned,
    scrollToIndex,
  }
}
