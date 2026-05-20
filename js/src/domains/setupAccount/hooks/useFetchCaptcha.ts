import moment from 'moment';
import {
    UseMutationOptions,
    UseMutationResult,
    useMutation,
} from 'react-query';

import { iasoFetch } from 'Iaso/libs/Api';

const CAPTCHA_REFRESH_URL = '/api/captcha/refresh/';

export type CaptchaRefreshResult = {
    captcha_hashkey: string;
    image_url: string;
};

type CaptchaRefreshJson = {
    key: string;
    image_url: string;
    audio_url?: string | null;
};

const fetchCaptcha = async (): Promise<CaptchaRefreshResult> => {
    const response = await iasoFetch(CAPTCHA_REFRESH_URL, {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Accept-Language': moment.locale(),
        },
    });
    const data = (await response.json()) as CaptchaRefreshJson;
    if (!data?.key || !data?.image_url) {
        throw new Error('Invalid captcha refresh response');
    }
    return {
        captcha_hashkey: data.key,
        image_url: data.image_url,
    };
};

/**
 * Refreshes the django-simple-captcha challenge. The endpoint requires
 * `X-Requested-With: XMLHttpRequest` (otherwise it 404s).
 *
 * Plain `useMutation`, not `useSnackMutation`: a captcha load failure is
 * surfaced inline inside the captcha frame, not as a global toast.
 */
export const useFetchCaptcha = (
    options?: UseMutationOptions<CaptchaRefreshResult, unknown, void>,
): UseMutationResult<CaptchaRefreshResult, unknown, void> =>
    useMutation(fetchCaptcha, options);
