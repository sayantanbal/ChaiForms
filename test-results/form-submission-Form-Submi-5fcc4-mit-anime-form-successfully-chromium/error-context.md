# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: form-submission.spec.ts >> Form Submission Flow >> should submit anime form successfully
- Location: apps\web\e2e\form-submission.spec.ts:14:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel('What\'s your anime genre preference?')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
    - generic [ref=e3]:
        - generic [ref=e4]: 🏜️
        - heading "Form Not Found" [level=1] [ref=e5]
        - paragraph [ref=e6]: The form you are looking for does not exist or has been deleted. Please check the URL and try again.
        - link "Explore Public Forms" [ref=e7] [cursor=pointer]:
            - /url: /explore
    - region "Notifications alt+T"
    - generic [ref=e12] [cursor=pointer]:
        - button "Open Next.js Dev Tools" [ref=e13]:
            - img [ref=e14]
        - generic [ref=e17]:
            - button "Open issues overlay" [ref=e18]:
                - generic [ref=e19]:
                    - generic [ref=e20]: "0"
                    - generic [ref=e21]: "1"
                - generic [ref=e22]: Issue
            - button "Collapse issues badge" [ref=e23]:
                - img [ref=e24]
    - alert [ref=e26]
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
  11 |     await expect(page.getByText("This field is required").first()).toBeVisible();
  12 |   });
  13 |
  14 |   test("should submit anime form successfully", async ({ page }) => {
  15 |     // Navigate to form
  16 |     await page.goto("/f/which-anime-character-are-you");
  17 |
  18 |     // Fill first page
> 19 |     await page.getByLabel("What's your anime genre preference?").click();
     |                                                                  ^ Error: locator.click: Test timeout of 30000ms exceeded.
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
