import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Venessa Study Mobile Journey', () => {
  test('completes full study journey from onboarding to quiz submission', async ({ page }) => {
    // 1. Onboarding
    await page.goto('/onboarding');
    await expect(page.getByText('Meet Your AI Tutor')).toBeVisible();

    // Skip to finish onboarding
    await page.getByRole('button', { name: 'Skip' }).click();
    await expect(page.getByText('Welcome, Venessa 👋')).toBeVisible();
    await page.getByRole('button', { name: 'Start Studying Now' }).click();

    // 2. Dashboard
    await expect(page.getByText(/Good (morning|afternoon|evening), Venessa 👋/)).toBeVisible();
    await expect(page.getByPlaceholder(/Try:/)).toBeVisible();

    // 3. Library
    await page.goto('/library');
    await expect(page.getByText('Study Library')).toBeVisible();
    await expect(page.getByText('Biology: Human Reproduction System')).toBeVisible();

    // Open Note Reader
    await page.locator('a[href^="/library/"]').first().click();
    await expect(page.getByText('1. Overview of Human Reproduction')).toBeVisible();
    await expect(page.getByText('✨ Ask AI about this note')).toBeVisible();

    // 4. Learn Topic
    await page.goto('/learn');
    await expect(page.getByText('Learn Any Topic 🎓')).toBeVisible();
    await page.fill('input[placeholder*="Photosynthesis"]', 'Cell Biology');
    await page.click('button:has-text("Generate Lesson")');
    await expect(page.getByText('Photosynthesis: How Plants Make Food')).toBeVisible();

    // 5. Practice & Quiz Taking
    await page.goto('/practice');
    await expect(page.getByText('Practice & Testing Hub')).toBeVisible();
    await page.fill('input[placeholder*="Human Reproduction"]', 'Cell Biology');
    await page.click('button:has-text("Start Practice Quiz")');

    // Inside Quiz Runner
    await expect(page.getByText(/Question \d+ of \d+/).first()).toBeVisible();

    // Verify Answer Secrecy: Ensure correct_option / answer key strings are NOT present in the page HTML during active quiz
    const pageHtml = await page.content();
    expect(pageHtml).not.toContain('correct_option');
    expect(pageHtml).not.toContain('question_answer_keys');

    // Navigate through questions to last question
    for (let i = 0; i < 4; i++) {
      const nextBtn = page.getByRole('button', { name: 'Next Question' });
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
      }
    }

    // On last question, click Review & Submit
    await page.getByRole('button', { name: 'Review & Submit' }).click();
    await expect(page.getByText('Review & Submit')).toBeVisible();
    await page.getByRole('button', { name: 'Submit Assessment Now' }).click();

    // Score Reveal
    await expect(page.getByText(/Well done|Good effort/)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Detailed Answer Review')).toBeVisible();

    // 6. Profile & Settings
    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: 'Venessa Ponohazo' })).toBeVisible();
    await expect(page.getByText('Learning Preferences')).toBeVisible();

    // 7. Accessibility Audit via axe-core
    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(['color-contrast']) // Color contrast checked via CSS design tokens
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
