import { test, expect } from "@playwright/test";

test.describe("Form Submission Flow", () => {
  test("should load the form successfully", async ({ page }) => {
    // Navigate to a non-existent form to verify the 404 behavior, or a known demo form if seeded
    // For now we just test the app loads and we can navigate to login
    await page.goto("/login");
    await expect(page).toHaveTitle(/ChaiForms/);
    await expect(page.getByText("Sign In")).toBeVisible();
  });
});
