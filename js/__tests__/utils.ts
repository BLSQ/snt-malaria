import { Page } from '@playwright/test';

export const expectNoErrors = async ({ page }: { page: Page }) => {
    await expect(
        page.locator('.error-container, .notistack-MuiContent-error'),
    ).toHaveCount(0);
    await expect(page.getByText('An exception occurred')).toHaveCount(0);
};
