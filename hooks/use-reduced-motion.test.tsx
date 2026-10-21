import { act, render, screen } from "@testing-library/react"
import { hydrateRoot, type Root } from "react-dom/client"
import { renderToString } from "react-dom/server.node"
import { useReducedMotion } from "./use-reduced-motion"

let reduced = false
jest.mock("motion/react", () => ({ useReducedMotion: () => reduced }))
function Probe() {
  return useReducedMotion() ? <p>Static content</p> : <div>Animated content</div>
}

test("the browser preference applies after mount", () => {
  reduced = true
  const { rerender } = render(<Probe />)
  expect(screen.getByText("Static content")).toBeInTheDocument()
  reduced = false
  rerender(<Probe />)
  expect(screen.getByText("Animated content")).toBeInTheDocument()
})

test("reduced-motion hydration preserves server markup without a recoverable error", async () => {
  reduced = true
  const container = document.createElement("div")
  container.innerHTML = renderToString(<Probe />)
  expect(container.innerHTML).toBe("<div>Animated content</div>")
  document.body.append(container)
  const errors: unknown[] = []
  let root: Root | undefined
  try {
    await act(async () => {
      root = hydrateRoot(container, <Probe />, {
        onRecoverableError: (error) => errors.push(error),
      })
    })
    expect(container.textContent).toBe("Static content")
    expect(errors).toEqual([])
  } finally {
    await act(async () => root?.unmount())
    container.remove()
  }
})
