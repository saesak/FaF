import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('View Toggle', () => {
  test('App loads with empty state', async ({ page }) => {
    await page.goto('/');

    // Wait for app to initialize
    await page.waitForSelector('.app-container');

    // Should show empty state with file picker
    await expect(page.locator('.empty-state')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.pick-btn')).toBeVisible();
  });

  test('Tab key toggles between Speed View and Reader View', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.app-container');

    // Wait for empty state
    await page.waitForSelector('.empty-state', { timeout: 5000 });

    // Get the file input and load a file
    const fileInput = page.locator('input[type="file"]');

    // Need to make it visible for setInputFiles to work
    await page.evaluate(() => {
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (input) {
        input.style.position = 'static';
        input.style.width = 'auto';
        input.style.height = 'auto';
        input.style.clip = 'unset';
        input.style.overflow = 'visible';
      }
    });

    await fileInput.setInputFiles(path.join(__dirname, '../fixtures/sample.txt'));

    // Wait for document to load - should show speed-view
    await page.waitForSelector('.speed-view', { timeout: 10000 });

    // Press Tab to switch to Reader View
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);

    // Should now be in Reader View
    await expect(page.locator('.reader-view')).toBeVisible({ timeout: 3000 });

    // Press Tab again to switch back to Speed View
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);

    // Should be back in Speed View
    await expect(page.locator('.speed-view')).toBeVisible({ timeout: 3000 });
  });
});
