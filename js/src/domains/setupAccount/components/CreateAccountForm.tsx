import React, {
    FunctionComponent,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import SyncIcon from '@mui/icons-material/Sync';
import {
    Box,
    Button,
    CircularProgress,
    IconButton,
    Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { LangOptions, useSafeIntl } from 'bluesquare-components';
import { useFormik } from 'formik';
import { isEqual, omit } from 'lodash';

import FileInputComponent from 'Iaso/components/forms/FileInputComponent';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { useLocale } from 'Iaso/domains/app/contexts/LocaleContext';
import {
    useApiErrorValidation,
    useTranslatedErrors,
} from 'Iaso/libs/validation';
import { SxStyles } from 'Iaso/types/general';

import { useAutoLogin } from '../hooks/useAutoLogin';
import {
    CreateAccountPayload,
    CreateAccountResponse,
    useCreateAccount,
} from '../hooks/useCreateAccount';
import { useFetchCaptcha } from '../hooks/useFetchCaptcha';
import { useSetupAccountValidation } from '../hooks/useSetupAccountValidation';
import { MESSAGES } from '../messages';
import { getCountryOptions } from '../utils/countries';

const styles = {
    sectionTitle: { mb: 1 },
    intro: {
        mb: 3,
        color: 'text.secondary',
    },
    helperText: {
        display: 'block',
        mt: 0.5,
        color: 'text.secondary',
        fontSize: '0.85rem',
    },
    topFieldsRow: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 2,
        mt: 2,
    },
    languageField: {
        flex: '0 0 auto',
        width: theme => theme.spacing(26),
    },
    countryField: {
        flex: '1 1 0',
        minWidth: 0,
    },
    actions: {
        mt: 3,
        display: 'flex',
        justifyContent: 'flex-end',
    },
    creating: {
        display: 'flex',
        alignItems: 'center',
        flexDirection: 'column',
        gap: 2,
        py: 4,
    },
    error: {
        color: 'error.main',
        mt: 2,
    },
    captchaSection: {
        mt: 3,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 2,
    },
    captchaFrame: {
        flex: '0 0 auto',
        boxSizing: 'border-box',
        width: theme => theme.spacing(29),
        height: theme => theme.spacing(14),
        p: 0.75,
        border: '1px solid',
        borderRadius: 1,
        borderColor: theme => alpha(theme.palette.text.primary, 0.23),
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    captchaImage: {
        display: 'block',
        width: '100%',
        height: '100%',
        objectFit: 'contain',
    },
    captchaControls: {
        flex: '1 1 0',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
    },
    captchaInputRow: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
    },
} satisfies SxStyles;

type FormValues = {
    country: string | undefined;
    username: string | undefined;
    password: string | undefined;
    password_confirmation: string | undefined;
    language: string;
    geo_json_file: File | undefined;
    captcha_hashkey: string;
    captcha_code: string;
};

const defaultInitialValues: FormValues = {
    country: undefined,
    username: undefined,
    password: undefined,
    password_confirmation: undefined,
    language: 'en',
    geo_json_file: undefined,
    captcha_hashkey: '',
    captcha_code: '',
};

const signupDirtyCompareOmit: Array<keyof FormValues> = [
    'language',
    'captcha_hashkey',
    'captcha_code',
];

// A locale change remounts the IntlProvider subtree, which resets Formik.
// Cached values let the form keep its inputs across that remount. Stored at
// module scope (not `sessionStorage`) because the GeoJSON `File` cannot be
// serialised. Captcha fields are never cached (they must pair a fresh key with
// user input).
let cachedFormValues: Omit<
    FormValues,
    'captcha_hashkey' | 'captcha_code'
> | null = null;

// Called by the page shell before changing the locale so the cached language
// matches the one the form will be re-initialised with.
export const setCachedLanguage = (code: LangOptions): void => {
    if (cachedFormValues) {
        cachedFormValues = { ...cachedFormValues, language: code };
    }
};

type Props = {
    onLanguageChange: (code: LangOptions) => void;
};

export const CreateAccountForm: FunctionComponent<Props> = ({
    onLanguageChange,
}) => {
    const { formatMessage } = useSafeIntl();
    const { locale } = useLocale();

    const countryOptions = useMemo(() => getCountryOptions(locale), [locale]);
    const languageOptions = useMemo(
        () => [
            { value: 'en', label: 'English' },
            { value: 'fr', label: 'Français' },
        ],
        [],
    );

    const [isRedirecting, setIsRedirecting] = useState(false);
    const [autoLoginError, setAutoLoginError] = useState<string | null>(null);

    const captcha = useFetchCaptcha();
    const captchaImageUrl = captcha.data?.image_url ?? null;
    const captchaLoadError = captcha.isError
        ? formatMessage(MESSAGES.captchaLoadError)
        : null;
    const captchaReady = Boolean(captcha.data) && !captcha.isError;

    const { mutateAsync: createAccount } = useCreateAccount();
    const autoLogin = useAutoLogin();

    const {
        apiErrors,
        payload,
        mutation: save,
    } = useApiErrorValidation<CreateAccountPayload, CreateAccountResponse>({
        mutationFn: createAccount,
        convertError: (dict: Record<string, string>) => {
            const out: Record<string, string> = { ...dict };
            if (out.error) {
                out.captcha_code = out.error;
                delete out.error;
            }
            return out;
        },
        onError: () => {
            captcha.mutate();
        },
        onSuccess: async (
            data: CreateAccountResponse,
            values: CreateAccountPayload,
        ) => {
            setIsRedirecting(true);
            try {
                await autoLogin({
                    username: values.username,
                    password: values.password,
                    taskId: data.task.id,
                });
            } catch (e) {
                setIsRedirecting(false);
                setAutoLoginError(formatMessage(MESSAGES.autoLoginFailed));
            }
        },
    });

    const schema = useSetupAccountValidation(apiErrors, payload, captchaReady);

    // Read once on mount: use the cache when present, otherwise seed the
    // form's language from the current locale so the dropdown and the
    // value posted to the backend match.
    const startingValues = useMemo<FormValues>(
        () =>
            cachedFormValues
                ? {
                      ...cachedFormValues,
                      captcha_hashkey: '',
                      captcha_code: '',
                  }
                : {
                      ...defaultInitialValues,
                      language: locale,
                  },
        [],
    );

    const formik = useFormik<FormValues>({
        initialValues: startingValues,
        enableReinitialize: true,
        validateOnBlur: true,
        validateOnMount: true,
        validationSchema: schema,
        onSubmit: (values, helpers) =>
            save(values as CreateAccountPayload, helpers),
    });

    const {
        values,
        errors,
        touched,
        isValid,
        isSubmitting,
        setFieldValue,
        setFieldTouched,
        handleSubmit,
    } = formik;

    // Sync the captcha challenge into the form: each new image gets its
    // hashkey wired into Formik and clears any stale solution the user typed
    // against the previous image. On error we drop the hashkey so the
    // backend doesn't get a stale one.
    useEffect(() => {
        if (captcha.data) {
            setFieldValue(
                'captcha_hashkey',
                captcha.data.captcha_hashkey,
                false,
            );
            setFieldValue('captcha_code', '', false);
        } else if (captcha.isError) {
            setFieldValue('captcha_hashkey', '', false);
        }
    }, [captcha.data, captcha.isError, setFieldValue]);

    // Load the first captcha challenge on mount. We intentionally omit
    // `captcha` from the dependency array to avoid re-fetching on every
    // mutation state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => captcha.mutate(), []);

    useEffect(() => {
        // Keep `cachedFormValues` in sync so a locale-driven remount restores the form.
        const { captcha_hashkey: _ch, captcha_code: _cc, ...rest } = values;
        cachedFormValues = rest;
    }, [values]);

    // Drop the cache once the user is leaving so a future visit starts fresh.
    useEffect(() => {
        if (isRedirecting) cachedFormValues = null;
    }, [isRedirecting]);

    const onLanguageChange_ = useCallback(
        (_keyValue: string | null, value: any) => {
            void setFieldValue('language', value as LangOptions);
            onLanguageChange(value as LangOptions);
        },
        [setFieldValue, onLanguageChange],
    );

    const onCaptchaCodeChange = useCallback(
        (_keyValue: string | null, value: any) => {
            setFieldTouched('captcha_code', true);
            setFieldValue(
                'captcha_code',
                value === undefined || value === null ? '' : String(value),
            );
        },
        [setFieldTouched, setFieldValue],
    );

    const onChange = useCallback(
        (keyValue: string | null, value: any): void => {
            if (!keyValue) return;
            setFieldTouched(keyValue, true);
            const processed = value === '' ? undefined : value;
            setFieldValue(keyValue, processed);
        },
        [setFieldTouched, setFieldValue],
    );

    const getErrors = useTranslatedErrors({
        errors,
        formatMessage,
        touched,
        messages: MESSAGES,
    });

    const captchaCodeErrors = getErrors('captcha_code');

    const signupValuesSnapshot = omit(values, signupDirtyCompareOmit);
    const signupDefaultsSnapshot = omit(
        defaultInitialValues,
        signupDirtyCompareOmit,
    );

    const showCreating = isSubmitting || isRedirecting;
    const allowConfirm =
        isValid &&
        captchaReady &&
        !captchaLoadError &&
        !isEqual(signupValuesSnapshot, signupDefaultsSnapshot);

    if (showCreating) {
        return (
            <Box sx={styles.creating}>
                <CircularProgress />
                <Typography>{formatMessage(MESSAGES.creating)}</Typography>
            </Box>
        );
    }

    return (
        <>
            <Typography variant="h6" sx={styles.sectionTitle}>
                {formatMessage(MESSAGES.title)}
            </Typography>
            <Typography variant="body2" sx={styles.intro}>
                {formatMessage(MESSAGES.intro)}
            </Typography>

            <Box sx={styles.topFieldsRow}>
                <Box sx={styles.languageField}>
                    <InputComponent
                        type="select"
                        required
                        keyValue="language"
                        labelString={formatMessage(MESSAGES.language)}
                        value={values.language}
                        onChange={onLanguageChange_}
                        options={languageOptions}
                        clearable={false}
                        withMarginTop={false}
                    />
                </Box>
                <Box sx={styles.countryField}>
                    <InputComponent
                        type="select"
                        required
                        keyValue="country"
                        labelString={formatMessage(MESSAGES.country)}
                        value={values.country}
                        onChange={onChange}
                        errors={getErrors('country')}
                        options={countryOptions}
                        clearable={false}
                        withMarginTop={false}
                    />
                </Box>
            </Box>
            <InputComponent
                type="text"
                required
                keyValue="username"
                labelString={formatMessage(MESSAGES.username)}
                value={values.username}
                onChange={onChange}
                errors={getErrors('username')}
            />
            <InputComponent
                type="password"
                required
                keyValue="password"
                labelString={formatMessage(MESSAGES.password)}
                value={values.password}
                onChange={onChange}
                errors={getErrors('password')}
            />
            <InputComponent
                type="password"
                required
                keyValue="password_confirmation"
                labelString={formatMessage(MESSAGES.passwordConfirmation)}
                value={values.password_confirmation}
                onChange={onChange}
                errors={getErrors('password_confirmation')}
            />
            <Box mt={2}>
                <FileInputComponent
                    keyValue="geo_json_file"
                    required
                    labelString={formatMessage(MESSAGES.geoJsonFile)}
                    errors={getErrors('geo_json_file')}
                    onChange={(key: string, file: any) =>
                        onChange(key, file ?? undefined)
                    }
                />
            </Box>
            <Typography variant="caption" sx={styles.helperText}>
                {formatMessage(MESSAGES.geoJsonFileHelp)}
            </Typography>

            <Box sx={styles.captchaSection}>
                <Box sx={styles.captchaFrame}>
                    {captchaLoadError ? (
                        <Typography
                            variant="caption"
                            role="alert"
                            sx={[
                                styles.helperText,
                                {
                                    mt: 0,
                                    color: 'error.main',
                                    textAlign: 'center',
                                },
                            ]}
                        >
                            {captchaLoadError}
                        </Typography>
                    ) : captchaImageUrl ? (
                        <Box
                            component="img"
                            src={captchaImageUrl}
                            alt=""
                            sx={styles.captchaImage}
                        />
                    ) : (
                        <CircularProgress size={28} />
                    )}
                </Box>
                <Box sx={styles.captchaControls}>
                    <Box sx={styles.captchaInputRow}>
                        <InputComponent
                            type="text"
                            required
                            keyValue="captcha_code"
                            labelString={formatMessage(MESSAGES.captchaCode)}
                            value={values.captcha_code}
                            onChange={onCaptchaCodeChange}
                            errors={captchaCodeErrors}
                            disabled={
                                !captchaReady || Boolean(captchaLoadError)
                            }
                            withMarginTop={false}
                            wrapperSx={{ flex: '1 1 0', minWidth: 0 }}
                        />
                        <IconButton
                            type="button"
                            color="primary"
                            aria-label={formatMessage(MESSAGES.captchaRefresh)}
                            disabled={captcha.isLoading}
                            onClick={() => captcha.mutate()}
                            sx={{ flexShrink: 0 }}
                        >
                            <SyncIcon />
                        </IconButton>
                    </Box>
                    <Typography
                        variant="caption"
                        sx={[styles.helperText, { mt: 0 }]}
                    >
                        {formatMessage(MESSAGES.captchaHelp)}
                    </Typography>
                </Box>
            </Box>

            {autoLoginError && (
                <Typography sx={styles.error}>
                    {autoLoginError}{' '}
                    <a href="/login/">{formatMessage(MESSAGES.goToLogin)}</a>
                </Typography>
            )}

            <Box sx={styles.actions}>
                <Button
                    data-test="setup-account-submit"
                    onClick={() => handleSubmit()}
                    disabled={!allowConfirm}
                    color="primary"
                    variant="contained"
                >
                    {formatMessage(MESSAGES.submit)}
                </Button>
            </Box>
        </>
    );
};
