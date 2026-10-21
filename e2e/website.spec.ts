import { expect, test } from "@playwright/test"
import { en } from "../content/en"
import { zh } from "../content/zh"
import { HTML_LANG, LOCALES, ROUTES, localePath } from "../lib/locale"

for (const locale of LOCALES) {
  for (const route of ROUTES) {
    test(`${locale} ${route} renders from the static export`, async ({ page }, testInfo) => {
      const errors: string[] = []
      page.on("pageerror", (error) => errors.push(error.message))
      const response = await page.goto(localePath(locale, route))
      expect(response?.status()).toBe(200)
      await expect(page.locator("html")).toHaveAttribute("lang", HTML_LANG[locale])
      await expect(page.getByRole("main")).toBeVisible()
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
      const canonical = await page.locator('link[rel="canonical"]').getAttribute("href")
      expect(canonical).toMatch(/^https?:\/\//)
      expect(new URL(canonical!).pathname.replace(/\/$/, "") || "/").toBe(localePath(locale, route))
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
        .toBe(true)
      expect(errors).toEqual([])
      if (route === "/")
        await page.screenshot({
          path: testInfo.outputPath(`${testInfo.project.name}-${locale}.png`),
        })
    })
  }
}

test("language switching preserves the route and the selected theme", async ({ page }) => {
  await page.goto("/product")
  const open = page.getByRole("button", { name: en.nav.openMenu, exact: true })
  if (await open.isVisible()) await open.click()
  await page.getByRole("button", { name: en.nav.themeToggle, exact: true }).click()
  await page.getByRole("menuitemradio", { name: en.nav.themeDark, exact: true }).click()
  await expect(page.locator("html")).toHaveClass(/dark/)
  await page.getByRole("link", { name: en.nav.switchLanguageTo, exact: true }).click()
  await expect(page).toHaveURL(/\/zh\/product$/)
  await expect(page.locator("html")).toHaveAttribute("lang", HTML_LANG.zh)
  await expect(page.locator("html")).toHaveClass(/dark/)
  const openZh = page.getByRole("button", { name: zh.nav.openMenu, exact: true })
  if (await openZh.isVisible()) await openZh.click()
  await page.getByRole("link", { name: zh.nav.switchLanguageTo, exact: true }).click()
  await expect(page).toHaveURL(/\/product$/)
})

test("production preview applies redirects, real 404s and exported metadata", async ({
  request,
}) => {
  const redirect = await request.get("/en/product?from=test", { maxRedirects: 0 })
  expect(redirect.status()).toBe(301)
  expect(redirect.headers().location).toBe("/product?from=test")
  expect((await request.get("/not-a-real-page")).status()).toBe(404)
  expect((await request.get("/sitemap.xml")).status()).toBe(200)
  expect((await request.get("/robots.txt")).status()).toBe(200)
})

test.describe("normal motion", () => {
  test.use({ reducedMotion: "no-preference" })
  for (const route of ["/", "/plugins"]) {
    test(`${route} hydrates with animations enabled`, async ({ page }) => {
      const errors: string[] = []
      page.on("pageerror", (error) => errors.push(error.message))
      await page.goto(route)
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
      await page.getByRole("main").click({ position: { x: 5, y: 5 } })
      expect(errors).toEqual([])
    })
  }
})
