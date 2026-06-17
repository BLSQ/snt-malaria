import React, { FC, useCallback, useMemo } from 'react';
import { TollOutlined } from '@mui/icons-material';
import CheckIcon from '@mui/icons-material/Check';
import { Stack, Typography } from '@mui/material';
import { Button } from '@mui/material';
import { LoadingSpinner, useSafeIntl } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { useTranslatedErrors } from 'Iaso/libs/validation';
import { CardStyled } from '../../../components/CardStyled';
import { IconBoxed } from '../../../components/IconBoxed';
import {
    CardScrollable,
    SettingsFormContainer,
} from '../../../components/styledComponents';
import { MESSAGES } from '../../messages';
import { useBudgetSettingsFormState } from './hooks/useBudgetSettingsFormState';
import { useGetBudgetSettings } from './hooks/useGetBudgetSettings';
import { useSaveBudgetSettings } from './hooks/useSaveBudgetSettings';
import { BudgetSettingsPayload } from './types';

export const BudgetSettingsTab: FC = () => {
    const { formatMessage } = useSafeIntl();

    const { data: budgetSettings, isLoading } = useGetBudgetSettings();
    const { mutate: saveBudgetSettings, isLoading: isSaving } =
        useSaveBudgetSettings();

    const initialValues = useMemo(
        () => ({
            id: budgetSettings?.id,
            local_currency: budgetSettings?.local_currency ?? '',
            exchange_rate: budgetSettings?.exchange_rate ?? '1',
            inflation_rate: budgetSettings?.inflation_rate ?? '0',
        }),
        [budgetSettings],
    );

    const onSubmit = useCallback(
        (values: BudgetSettingsPayload) => {
            if (!values.id) {
                return;
            }
            saveBudgetSettings({
                id: values.id,
                local_currency: values.local_currency.toUpperCase(),
                exchange_rate: values.exchange_rate,
                inflation_rate: values.inflation_rate,
            });
        },
        [saveBudgetSettings],
    );

    const formik = useBudgetSettingsFormState({ onSubmit, initialValues });
    const { values, errors, touched, setFieldValue, setFieldTouched } = formik;

    const onChange = useCallback(
        (keyValue: string | null, value: unknown) => {
            if (!keyValue) {
                return;
            }
            setFieldTouched(keyValue, true);
            setFieldValue(keyValue, value ?? '');
        },
        [setFieldTouched, setFieldValue],
    );

    const getErrors = useTranslatedErrors({
        errors,
        touched,
        formatMessage,
        messages: MESSAGES,
    });

    return (
        <CardScrollable>
            <CardStyled
                header={
                    <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                    >
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <IconBoxed Icon={TollOutlined} />
                            <Typography variant="h6">
                                {formatMessage(MESSAGES.budgetSettingsTitle)}
                            </Typography>
                        </Stack>
                        <Button
                            onClick={() => formik.handleSubmit()}
                            variant="contained"
                            color="primary"
                            startIcon={<CheckIcon />}
                            disabled={isSaving || !budgetSettings?.id}
                        >
                            {formatMessage(MESSAGES.save)}
                        </Button>
                    </Stack>
                }
            >
                {isLoading && <LoadingSpinner absolute />}
                <SettingsFormContainer>
                    <Stack spacing={2}>
                        <Typography variant="caption" color="textSecondary">
                            {formatMessage(MESSAGES.budgetSettingsSubtitle)}
                        </Typography>
                        <InputComponent
                            keyValue="local_currency"
                            type="text"
                            value={values.local_currency}
                            onChange={onChange}
                            errors={getErrors('local_currency')}
                            labelString={formatMessage(
                                MESSAGES.budgetLocalCurrency,
                            )}
                            helperText={formatMessage(
                                MESSAGES.budgetLocalCurrencyHelp,
                            )}
                            withMarginTop={false}
                        />
                        <InputComponent
                            keyValue="exchange_rate"
                            type="number"
                            required
                            value={values.exchange_rate}
                            onChange={onChange}
                            errors={getErrors('exchange_rate')}
                            labelString={formatMessage(
                                MESSAGES.budgetExchangeRate,
                            )}
                            withMarginTop={false}
                        />
                        <InputComponent
                            keyValue="inflation_rate"
                            type="number"
                            required
                            value={values.inflation_rate}
                            onChange={onChange}
                            errors={getErrors('inflation_rate')}
                            labelString={formatMessage(
                                MESSAGES.budgetInflationRate,
                            )}
                            helperText={formatMessage(
                                MESSAGES.budgetInflationRateHelp,
                            )}
                            withMarginTop={false}
                        />
                    </Stack>
                </SettingsFormContainer>
            </CardStyled>
        </CardScrollable>
    );
};
