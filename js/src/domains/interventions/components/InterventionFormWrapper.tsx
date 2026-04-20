import React, { FC, useCallback, useEffect } from 'react';
import { LoadingButton } from '@mui/lab';
import { Button, Stack, Typography } from '@mui/material';
import { LoadingSpinner, useSafeIntl } from 'bluesquare-components';
import { CardStyled } from '../../../components/CardStyled';
import { ExtendedFormikProvider } from '../../../hooks/useGetExtendedFormikContext';
import { MESSAGES } from '../../messages';
import { useGetMetricTypes } from '../../planning/hooks/useGetMetrics';
import { InterventionDetails } from '../../planning/types/interventions';
import { useGetBudgetSettings } from '../hooks/useGetBudgetSettings';
import { useGetInterventionCostBreakdownLineCategories } from '../hooks/useGetInterventionCostBreakdownLineCategories';
import { useGetInterventionCostUnitTypes } from '../hooks/useGetInterventionCostUnitType';
import { useGetInterventionDetails } from '../hooks/useGetInterventionDetails';
import { useInterventionFormState } from '../hooks/useInterventionFormState';
import { useSaveInterventionDetails } from '../hooks/useSaveInterventionDetails';
import { InterventionForm } from './InterventionForm';

type Props = {
    interventionId?: number;
};

const defaultTargetPopulationSettings: Record<string, string[]> = {
    iptp: ['pop_pw'],
    itn_campaign: ['pop_total'],
    itn_routine: ['pop_0_5', 'pop_pw'],
    pmc: ['pop_0_1', 'pop_1_2'],
    smc: ['pop_0_5'],
    vacc: ['pop_vaccine_5_36_months'],
};

export const InterventionFormWrapper: FC<Props> = ({ interventionId }) => {
    const { formatMessage } = useSafeIntl();

    const { data: interventionCostCategories = [] } =
        useGetInterventionCostBreakdownLineCategories();

    const { data: interventionCostUnitTypes = [] } =
        useGetInterventionCostUnitTypes();

    const { data: metricTypes = [] } = useGetMetricTypes();
    const { data: budgetSettings } = useGetBudgetSettings();

    const {
        mutate: saveInterventionDetails,
        isLoading: isSavingInterventionDetails,
    } = useSaveInterventionDetails(interventionId);
    const onSubmit = useCallback(
        (values: Partial<InterventionDetails>) =>
            saveInterventionDetails(values),
        [saveInterventionDetails],
    );

    const {
        data: interventionDetails,
        isFetching: isFetchingInterventionDetails,
    } = useGetInterventionDetails({
        interventionId,
    });

    const formik = useInterventionFormState({
        onSubmit,
    });

    useEffect(() => {
        if (!interventionDetails) {
            return;
        }

        let defaultPop = interventionDetails.target_population;

        if (!defaultPop || defaultPop.length === 0) {
            defaultPop = defaultTargetPopulationSettings[
                interventionDetails.code
            ] || [''];

            defaultPop = defaultPop.map(pop =>
                metricTypes.find(metric => metric.code === pop) ? pop : '',
            );
        }

        formik.resetForm({
            values: {
                ...interventionDetails,
                target_population: defaultPop,
            },
        });
    }, [interventionDetails, metricTypes]); // Only run when interventionDetails or metricTypes changes

    return (
        <CardStyled
            header={
                <Stack direction="row" justifyContent="space-between">
                    <Typography variant="h6">
                        {interventionDetails?.name}
                    </Typography>
                    <LoadingButton
                        onClick={() => formik.handleSubmit()}
                        variant="outlined"
                        loading={isSavingInterventionDetails}
                    >
                        {formatMessage(MESSAGES.save)}
                    </LoadingButton>
                </Stack>
            }
        >
            {isFetchingInterventionDetails && (
                <LoadingSpinner absolute={true} />
            )}

            <ExtendedFormikProvider formik={formik}>
                <InterventionForm
                    interventionCostCategories={interventionCostCategories}
                    interventionCostUnitTypes={interventionCostUnitTypes}
                    metricTypes={metricTypes}
                    currency={budgetSettings?.currency}
                />
            </ExtendedFormikProvider>
        </CardStyled>
    );
};
