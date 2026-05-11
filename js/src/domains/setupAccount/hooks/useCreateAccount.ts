import { UseMutationResult } from 'react-query';

import { postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';

export type CreateAccountPayload = {
    username: string;
    password: string;
    password_confirmation: string;
    country: string;
    language: string;
    geo_json_file: File;
    captcha_hashkey: string;
    captcha_code: string;
};

export type CreateAccountResponse = {
    task: {
        id: number;
        status: string;
    };
};

const ACCOUNT_SETUP_URL = '/api/snt_malaria/account_setup/';

const createAccount = (
    payload: CreateAccountPayload,
): Promise<CreateAccountResponse> => {
    const { geo_json_file, ...rest } = payload;
    // postRequest's multipart branch JSON-stringifies non-file values; we
    // want plain strings on the server side so we keep them as-is.
    return postRequest({
        url: ACCOUNT_SETUP_URL,
        data: rest,
        fileData: { geo_json_file },
    });
};

export const useCreateAccount = (): UseMutationResult<
    CreateAccountResponse,
    unknown,
    CreateAccountPayload
> =>
    useSnackMutation<CreateAccountResponse, unknown, CreateAccountPayload>({
        mutationFn: createAccount,
        // 400 errors are surfaced as field validation by useApiErrorValidation,
        // not as toast notifications.
        ignoreErrorCodes: [400],
        showSuccessSnackBar: false,
    });
