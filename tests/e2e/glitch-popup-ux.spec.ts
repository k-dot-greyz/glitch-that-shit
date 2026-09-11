/**
 * Playwright UX flow — popup settings journey (user story P0).
 *
 * User story: As a sensory-sensitive user, I open the extension popup,
 * switch sensory mode, adjust OKLCH sliders, and reset to defaults —
 * without console errors or broken controls.
 *
 * Priority: P0 (core settings UX path, high blast radius).
 */

import { test, expect, type Page } from '@playwright/test';

const POPUP_PATH = '/index.html';

async function waitForPopup(page: Page) {
  await page.waitForSelector('.zen-popup', { timeout: 10_000 });
}

test.describe('glitch-that-shit popup UX', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(POPUP_PATH);
    await waitForPopup(page);
  });

  test('renders sensory mode controls and preview', async ({ page }) => {
    await expect(page.locator('[data-sensory="calm"]')).toBeVisible();
    await expect(page.locator('[data-sensory="glitch"]')).toBeVisible();
    await expect(page.locator('#preview')).toBeVisible();
    await expect(page.locator('#btn-reset')).toBeVisible();
  });

  test('user switches sensory mode to glitch', async ({ page }) => {
    await page.locator('[data-sensory="glitch"]').click();
    await expect(page.locator('[data-sensory="glitch"]')).toHaveClass(/active/);
    await expect(page.locator('[data-sensory="calm"]')).not.toHaveClass(/active/);
  });

  test('user adjusts lightness slider and sees live value', async ({ page }) => {
    const slider = page.locator('#slider-lightness');
    const display = page.locator('#val-lightness');
    await slider.fill('0.22');
    await expect(display).toHaveText('0.22');
  });

  test('user toggles reduce motion checkbox', async ({ page }) => {
    const motion = page.locator('#chk-motion');
    const initial = await motion.isChecked();
    await motion.click();
    await expect(motion).toBeChecked({ checked: !initial });
  });

  test('user resets settings via reset button', async ({ page }) => {
    await page.locator('[data-sensory="high-contrast"]').click();
    await page.locator('#btn-reset').click();
    await waitForPopup(page);
    await expect(page.locator('[data-sensory="calm"]')).toHaveClass(/active/);
  });

  test('no console errors during happy-path interaction', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.locator('[data-sensory="glitch"]').click();
    await page.locator('#slider-hue').fill('200');
    await page.locator('#chk-hdr').click();
    await page.locator('#btn-reset').click();
    await waitForPopup(page);

    expect(errors).toEqual([]);
  });
});
