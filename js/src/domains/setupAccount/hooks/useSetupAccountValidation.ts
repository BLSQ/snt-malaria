import { useMemo } from 'react';
import { mixed, object, ObjectSchema, ref, string } from 'yup';

import { useAPIErrorValidator } from 'Iaso/libs/validation';
import { ValidationError } from 'Iaso/types/utils';

import { CreateAccountPayload } from './useCreateAccount';

const isValidGeoJsonFile = (file: unknown): boolean => {
    if (!file || typeof file !== 'object') return false;
    const name = (file as File).name;
    if (!name) return false;
    return name.endsWith('.json') || name.endsWith('.geojson');
};

export const useSetupAccountValidation = (
    errors: ValidationError = {},
    payload: Partial<CreateAccountPayload>,
    captchaReady: boolean,
): ObjectSchema<any> => {
    const apiValidator = useAPIErrorValidator<Partial<CreateAccountPayload>>(
        errors,
        payload,
    );

    return useMemo(() => {
        return object().shape({
            country: string()
                .nullable()
                .required('requiredField')
                .test(apiValidator('country')),
            username: string()
                .nullable()
                .required('requiredField')
                .test(apiValidator('username')),
            password: string()
                .nullable()
                .required('requiredField')
                .test(apiValidator('password')),
            password_confirmation: string()
                .nullable()
                .required('requiredField')
                .oneOf([ref('password')], 'passwordsMustMatch')
                .test(apiValidator('password_confirmation')),
            language: string().nullable().required('requiredField'),
            geo_json_file: mixed()
                .required('requiredField')
                .test(
                    'is-geojson',
                    'invalidGeoJsonExtension',
                    isValidGeoJsonFile,
                )
                .test(apiValidator('geo_json_file')),
            captcha_hashkey: string()
                .nullable()
                .test({
                    name: 'captcha_hashkey_when_ready',
                    message: 'requiredField',
                    test(value) {
                        if (!captchaReady) return true;
                        return Boolean(value && String(value).length > 0);
                    },
                })
                .test(apiValidator('captcha_hashkey')),
            captcha_code: string()
                .nullable()
                .test({
                    name: 'captcha_code_when_ready',
                    message: 'requiredField',
                    test(value) {
                        if (!captchaReady) return true;
                        return Boolean(
                            value && String(value).trim().length > 0,
                        );
                    },
                })
                .test(apiValidator('captcha_code')),
        });
    }, [apiValidator, captchaReady]);
};
