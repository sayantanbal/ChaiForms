# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: form-submission.spec.ts >> Form Submission Flow >> should validate required fields
- Location: apps\web\e2e\form-submission.spec.ts:4:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('This field is required').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('This field is required').first()

```

```yaml
- text: Loading form...
- region "Notifications alt+T"
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  |
  3  | test.describe("Form Submission Flow", () => {
  4  |   test("should validate required fields", async ({ page }) => {
  5  |     await page.goto("/f/which-anime-character-are-you");
  6  |
  7  |     // Click Next without filling anything (assuming fields are required)
  8  |     await page.getByRole("button", { name: "Next" }).click();
  9  |
  10 |     // Should show validation error
> 11 |     await expect(page.getByText("This field is required").first()).toBeVisible();
     |                                                                    ^ Error: expect(locator).toBeVisible() failed
  12 |   });
  13 |
  14 |   test("should submit anime form successfully", async ({ page }) => {
  15 |     // Navigate to form
  16 |     await page.goto("/f/which-anime-character-are-you");
  17 |
  18 |     // Fill first page
  19 |     await page.getByLabel("What's your anime genre preference?").click();
  20 |     await page.getByRole("option", { name: "Shonen" }).click();
  21 |
  22 |     await page.getByLabel("Choose your fighting style").click();
  23 |     await page.getByRole("option", { name: "Speed" }).click();
  24 |
  25 |     await page.getByLabel("How important is friendship in anime?").fill("8");
  26 |
  27 |     // Next page
  28 |     await page.getByRole("button", { name: "Next" }).click();
  29 |
  30 |     // Fill second page
  31 |     await page.getByLabel("Which anime have you watched?").click();
  32 |     await page.getByRole("option", { name: "Naruto" }).click();
  33 |     await page.getByRole("option", { name: "One Piece" }).click();
  34 |
  35 |     // Close dropdown by clicking body or escaping
  36 |     await page.keyboard.press('Escape');
  37 |
  38 |     await page
  39 |       .getByLabel("What would your anime character's special move be called?")
  40 |       .fill("Lightning Strike");
  41 |
  42 |     await page.getByLabel("Your email (for character reveal)").fill("test@example.com");
  43 |
  44 |     // Submit
  45 |     await page.getByRole("button", { name: "Submit" }).click();
  46 |
  47 |     // Verify thank you message
  48 |     await expect(page.getByText("Thank you for your response!")).toBeVisible();
  49 |   });
  50 | });
  51 |
```
