import { expect, test } from '@playwright/test';

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.skip(!email || !password, 'Set E2E_EMAIL and E2E_PASSWORD to run this test');

test('log in, add an application, reject it, see it move to the Rejected page', async ({ page }) => {
  const company = `E2E Co ${Date.now()}`;

  await page.goto('/login');
  await page.getByLabel('Email').fill(email!);
  await page.getByLabel('Password').fill(password!);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL('/');

  await page.goto('/applications/new');
  await page.getByLabel('Business name').fill(company);
  await page.getByLabel('Job title').fill('Playwright Engineer');
  await page.getByLabel('Salary min (USD)').fill('80000');
  await page.getByLabel('Salary max (USD)').fill('120000');
  await page.getByRole('button', { name: 'Add application' }).click();

  await expect(page).toHaveURL('/applications');
  await expect(page.getByRole('cell', { name: company })).toBeVisible();

  await page
    .getByRole('row', { name: new RegExp(company) })
    .getByRole('link', { name: 'Edit' })
    .click();
  await page.getByLabel('Status').selectOption('Rejected');
  await page.getByRole('button', { name: 'Save changes' }).click();

  await expect(page).toHaveURL('/rejected');
  await expect(page.getByRole('cell', { name: company })).toBeVisible();

  await page.goto('/applications');
  await expect(page.getByRole('cell', { name: company })).toHaveCount(0);

  // cleanup
  await page.goto('/rejected');
  page.on('dialog', (d) => d.accept());
  await page
    .getByRole('row', { name: new RegExp(company) })
    .getByRole('button', { name: 'Delete' })
    .click();
  await expect(page.getByRole('cell', { name: company })).toHaveCount(0);
});
