import React, { FunctionComponent } from 'react';

import { useSafeIntl } from 'bluesquare-components';

import InputComponent from 'Iaso/components/forms/InputComponent';

import { useBudgetSettingsForm } from '../hooks/useBudgetSettingsForm';
import { MESSAGES } from '../messages';
import { WizardStep } from './WizardStep';

type Props = {
    isLastStep: boolean;
    onFinish: () => void;
};

export const BudgetSettingsStep: FunctionComponent<Props> = ({
    isLastStep,
    onFinish,
}) => {
    const { formatMessage } = useSafeIntl();

    const {
        isLoading,
        isSaving,
        canSave,
        values,
        isValid,
        isValidating,
        handleSubmit,
        onChange,
        getErrors,
    } = useBudgetSettingsForm(onFinish);

    return (
        <WizardStep
            title={formatMessage(MESSAGES.budgetSettingsTitle)}
            description={formatMessage(MESSAGES.budgetSettingsDescription)}
            loading={isLoading}
            isLastStep={isLastStep}
            onSubmit={handleSubmit}
            submitting={isSaving}
            submitDisabled={!canSave || !isValid || isValidating}
            submitDataTestId="configureAccount-budgetsettings-finish"
        >
            <InputComponent
                type="text"
                keyValue="local_currency"
                labelString={formatMessage(MESSAGES.localCurrency)}
                value={values.local_currency}
                onChange={onChange}
                errors={getErrors('local_currency')}
                helperText={formatMessage(MESSAGES.localCurrencyHelp)}
            />
            <InputComponent
                type="number"
                required
                keyValue="exchange_rate"
                labelString={formatMessage(MESSAGES.exchangeRate)}
                value={values.exchange_rate}
                onChange={onChange}
                errors={getErrors('exchange_rate')}
            />
            <InputComponent
                type="number"
                required
                keyValue="inflation_rate"
                labelString={formatMessage(MESSAGES.inflationRate)}
                value={values.inflation_rate}
                onChange={onChange}
                errors={getErrors('inflation_rate')}
                helperText={formatMessage(MESSAGES.inflationRateHelp)}
            />
        </WizardStep>
    );
};
