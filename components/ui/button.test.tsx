import { render, screen } from "@testing-library/react"
import { Button } from "./button"

describe("Button", () => {
  it("leaves the site-wide focus ring in place", () => {
    render(<Button>Build from source</Button>)
    // `outline-none` is a utility, so it outranks the base `:focus-visible`
    // outline in globals.css and would leave the button with no visible focus.
    expect(screen.getByRole("button").className).not.toMatch(/\boutline-none\b/)
  })

  it("acknowledges a press without moving layout", () => {
    render(<Button>Build from source</Button>)
    expect(screen.getByRole("button")).toHaveClass("active:translate-y-px")
  })
})
