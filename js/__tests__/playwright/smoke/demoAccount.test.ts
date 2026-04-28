import { test, expect } from '@playwright/test';

test.describe('Demo account login smoke tests', () => {
    test('login page appears', async ({ page }) => {
        await page.goto('');

        await expect(page).toHaveURL('/login/?next=%2Fdashboard%2Fhome%2F');
        await expect(page).toHaveTitle('SNT Malaria');
    });

    test('login works', async ({ page }) => {
        await page.goto('/login/');
        await page.fill(
            'input[name="username"]',
            process.env?.LOGIN_USERNAME ?? '',
        );
        await page.fill(
            'input[name="password"]',
            process.env?.LOGIN_PASSWORD ?? '',
        );
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(
            new RegExp('dashboard/snt_malaria/scenarios/list/accountId/'),
        );
        await expect(page).toHaveTitle(/SNT Malaria/);
    });
});
