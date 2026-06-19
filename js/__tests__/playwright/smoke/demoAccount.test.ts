import { test, expect, Page } from '@playwright/test';
import { expectNoErrors } from '../../utils';

test.describe('Demo account login smoke tests', () => {
    test('login page appears', async (props: { page: Page }) => {
        await props.page.goto('');

        await expect(props.page).toHaveURL(
            '/login/?next=%2Fdashboard%2Fhome%2F',
        );
        await expect(props.page).toHaveTitle('SNT Malaria');
        await expectNoErrors(props);
    });

    test('login works', async (props: { page: Page }) => {
        await props.page.goto('/login/');
        await props.page.fill(
            'input[name="username"]',
            process.env?.LOGIN_USERNAME ?? '',
        );
        await props.page.fill(
            'input[name="password"]',
            process.env?.LOGIN_PASSWORD ?? '',
        );
        await props.page.click('button[type="submit"]');
        await expect(props.page).toHaveURL(
            new RegExp('dashboard/snt_malaria/scenarios/list/accountId/'),
        );
        await expect(props.page).toHaveTitle(/SNT Malaria/);
        await expectNoErrors(props);
    });
});
