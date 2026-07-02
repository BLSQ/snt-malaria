import React, { FunctionComponent, useCallback } from 'react';

import { useSafeIntl } from 'bluesquare-components';
import { useFormik } from 'formik';
import { object, string } from 'yup';

import InputComponent from 'Iaso/components/forms/InputComponent';
import { useGetCurrentUser } from 'Iaso/domains/users/hooks/useGetCurrentUser';
import { useSaveCurrentUser } from 'Iaso/domains/users/hooks/useSaveCurrentUser';
import { useTranslatedErrors } from 'Iaso/libs/validation';

import { MESSAGES } from '../messages';
import { WizardStep } from './WizardStep';

type Props = {
    isLastStep: boolean;
    onAdvance: () => void;
};

type FormValues = {
    first_name: string;
    last_name: string;
    email: string;
};

// Empty email is normalized to undefined so yup `.email()` does not run on "".
const validationSchema = object().shape({
    first_name: string().nullable(),
    last_name: string().nullable(),
    email: string()
        .nullable()
        .transform(value => (value === '' ? undefined : value))
        .email('invalidEmail'),
});

export const UserInfoStep: FunctionComponent<Props> = ({
    isLastStep,
    onAdvance,
}) => {
    const { formatMessage } = useSafeIntl();
    const { data: userInfo, isLoading } = useGetCurrentUser(true);
    const { mutateAsync: save, isLoading: isSaving } =
        useSaveCurrentUser(false);

    const formik = useFormik<FormValues>({
        initialValues: {
            first_name: userInfo?.first_name ?? '',
            last_name: userInfo?.last_name ?? '',
            email: userInfo?.email ?? '',
        },
        validateOnBlur: true,
        validateOnChange: true,
        validationSchema,
        onSubmit: async values => {
            const hasAny = Boolean(
                values.first_name?.trim() ||
                values.last_name?.trim() ||
                values.email?.trim(),
            );
            if (hasAny) {
                await save(values);
            }
            onAdvance();
        },
    });

    const {
        values,
        errors,
        touched,
        isValid,
        isValidating,
        setFieldValue,
        setFieldTouched,
        handleSubmit,
    } = formik;

    const onChange = useCallback(
        (keyValue: string | null, value: any) => {
            if (!keyValue) return;
            setFieldTouched(keyValue, true);
            setFieldValue(keyValue, value ?? '');
        },
        [setFieldTouched, setFieldValue],
    );

    const getErrors = useTranslatedErrors({
        errors,
        formatMessage,
        touched,
        messages: MESSAGES,
    });

    return (
        <WizardStep
            title={formatMessage(MESSAGES.userInfoTitle)}
            description={formatMessage(MESSAGES.userInfoDescription)}
            loading={isLoading}
            isLastStep={isLastStep}
            onSubmit={() => handleSubmit()}
            submitting={isSaving}
            submitDisabled={!isValid || isValidating}
            submitDataTestId="configureAccount-userinfo-next"
        >
            <InputComponent
                type="text"
                keyValue="first_name"
                labelString={formatMessage(MESSAGES.firstName)}
                value={values.first_name}
                onChange={onChange}
                errors={getErrors('first_name')}
            />
            <InputComponent
                type="text"
                keyValue="last_name"
                labelString={formatMessage(MESSAGES.lastName)}
                value={values.last_name}
                onChange={onChange}
                errors={getErrors('last_name')}
            />
            <InputComponent
                type="email"
                keyValue="email"
                labelString={formatMessage(MESSAGES.email)}
                value={values.email}
                onChange={onChange}
                errors={getErrors('email')}
            />
        </WizardStep>
    );
};
