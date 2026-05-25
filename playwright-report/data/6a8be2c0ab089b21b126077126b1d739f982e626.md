# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: form-builder.spec.ts >> Form Builder >> should create new form
- Location: apps\web\e2e\form-builder.spec.ts:13:3

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /Continue as Demo Creator/i })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
    - main [ref=e2]:
        - generic [ref=e3]:
            - generic [ref=e4]:
                - paragraph [ref=e5]: ChaiForms
                - heading "Sign in" [level=1] [ref=e6]
                - paragraph [ref=e7]: Build, publish, and analyze forms in minutes.
            - generic [ref=e9]:
                - generic [ref=e10]:
                    - generic [ref=e11]: Email
                    - textbox "Email" [ref=e12]
                - generic [ref=e13]:
                    - generic [ref=e14]: Password
                    - textbox "Password" [ref=e15]
                - button "Sign in" [ref=e16]
                - paragraph [ref=e17]:
                    - text: No account?
                    - link "Sign up" [ref=e18] [cursor=pointer]:
                        - /url: /auth/sign-up
    - region "Notifications alt+T"
    - generic [ref=e23] [cursor=pointer]:
        - button "Open Next.js Dev Tools" [ref=e24]:
            - img [ref=e25]
        - generic [ref=e28]:
            - button "Open issues overlay" [ref=e29]:
                - generic [ref=e30]:
                    - generic [ref=e31]: "0"
                    - generic [ref=e32]: "1"
                - generic [ref=e33]: Issue
            - button "Collapse issues badge" [ref=e34]:
                - img [ref=e35]
    - alert [ref=e37]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  |
  3  | test.describe("Form Builder", () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // Login as demo user
  6  |     await page.goto("/login");
> 7  |     await page.getByRole("button", { name: /Continue as Demo Creator/i }).click();
     |                                                                           ^ Error: locator.click: Test timeout of 30000ms exceeded.
  8  |
  9  |     // Wait for redirect to dashboard
  10 |     await expect(page).toHaveURL(/\/dashboard/);
  11 |   });
  12 |
  13 |   test("should create new form", async ({ page }) => {
  14 |     await page.goto("/dashboard");
  15 |
  16 |     // Click Create Form (could be a link or button, try looking for the text)
  17 |     const createButton = page.getByRole("link", { name: /Create Form/i }).or(page.getByRole("button", { name: /Create Form/i })).first();
  18 |     await createButton.click();
  19 |
  20 |     // Verify it navigated to the builder (which has /forms/new or /forms/.../builder)
  21 |     await expect(page).toHaveURL(/\/dashboard\/forms/);
  22 |
  23 |     // Fill in the title if it asks
  24 |     const titleInput = page.getByPlaceholder(/Untitled Form|Enter form title/i).first();
  25 |     if (await titleInput.isVisible()) {
  26 |       await titleInput.fill("My E2E Test Form");
  27 |       await page.getByRole("button", { name: /Save|Create/i }).first().click();
  28 |     }
  29 |
  30 |     // Just verify that the "Settings" or "Share" tab is visible indicating the builder loaded
  31 |     await expect(page.getByRole("tab", { name: /Settings|Build|Share/i }).first()).toBeVisible();
  32 |   });
  33 | });
  34 |
```
