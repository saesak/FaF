import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

// Test fixtures path (ES module compatible)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.join(__dirname, '../fixtures');

test.describe('FaF Speed Reader', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('App Loads', () => {
    test('should display the main page', async ({ page }) => {
      await expect(page).toHaveTitle(/FaF/i);
    });
  });

  test.describe('File Loading', () => {
    test('should load a text file', async ({ page }) => {
      // TODO: Implement when file input UI is ready
      // const fileInput = page.locator('input[type="file"]');
      // await fileInput.setInputFiles(path.join(FIXTURES_DIR, 'sample.txt'));
      test.skip();
    });
  });

  test.describe('Playback Controls', () => {
    test('should have play/pause button', async ({ page }) => {
      // TODO: Implement when playback UI is ready
      test.skip();
    });

    test('should start playback when play is clicked', async ({ page }) => {
      // TODO: Implement when playback UI is ready
      test.skip();
    });
  });

  test.describe('Speed View', () => {
    test('should display current word with ORP highlight', async ({ page }) => {
      // TODO: Implement when SpeedView is ready
      test.skip();
    });
  });

  test.describe('Settings', () => {
    test('should adjust WPM', async ({ page }) => {
      // TODO: Implement when settings UI is ready
      test.skip();
    });
  });
});
