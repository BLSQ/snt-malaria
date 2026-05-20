import { useCallback } from 'react';

import { postRequest } from 'Iaso/libs/Api';

import { baseUrls } from '../../../constants/urls';

type AutoLoginParams = {
    username: string;
    password: string;
    taskId: number;
};

type TokenResponse = {
    access: string;
    refresh: string;
};

/**
 * Logs the freshly-created user in via JWT, then hard-redirects through
 * `/api/token_auth/` so Django sets a session cookie. The redirect target is
 * the configure-account wizard, which needs that session for its API calls.
 */
export const useAutoLogin = () =>
    useCallback(async ({ username, password, taskId }: AutoLoginParams) => {
        const tokens: TokenResponse = await postRequest('/api/token/', {
            username,
            password,
        });

        const next = `/dashboard/${baseUrls.configureAccount}/taskId/${taskId}`;
        const url = `/api/token_auth/?token=${encodeURIComponent(
            tokens.access,
        )}&next=${encodeURIComponent(next)}`;
        window.location.href = url;
    }, []);
