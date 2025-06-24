import { test, expect } from '@playwright/test';

test.describe('Chat Application', () => {
  test('should load the chat interface', async ({ page }) => {
    await page.goto('/ask');
    
    // Check if main elements are present
    await expect(page.getByText("I'm the Elastic Path AI")).toBeVisible();
    await expect(page.getByPlaceholder('Ask a Question')).toBeVisible();
  });

  test('should send a message and receive a response', async ({ page }) => {
    await page.goto('/ask');
    
    // Type and send a message
    await page.getByPlaceholder('Ask a Question').fill('What is PXM?');
    // await page.getByRole('button', { name: 'Send' }).click();
    await page.locator('form').getByRole('button').click();
    
    // Wait for response with extended timeout for longer responses
    await expect(page.locator('.whitespace-pre-wrap').filter({ hasText: 'PXM' }))
      .toBeVisible({ timeout: 120000 }); // Increased to 2 minutes for complex responses
  });

  test('should show error message properly', async ({ page }) => {
    await page.goto('/ask');
    
    // Force an error by breaking the API connection
    await page.route('/api/chat', async (route) => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Test error message' })
      });
    });
    
    // Send a message
    await page.getByPlaceholder('Ask a Question').fill('This should error');
    // await page.getByRole('button', { name: 'Send' }).click();
    await page.locator('form').getByRole('button').click();
    // Check if error message appears
    await expect(page.getByText('{"error":"Test error message"}')).toBeVisible();
  });
}); 