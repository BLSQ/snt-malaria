import React, { FC, useCallback, useEffect } from 'react';
import { LoadingButton } from '@mui/lab';
import { Stack, Typography } from '@mui/material';
import { LoadingSpinner, useSafeIntl } from 'bluesquare-components';
import { CardStyled } from '../../../../components/CardStyled';
import { ExtendedFormikProvider } from '../../../../hooks/useGetExtendedFormikContext';
import { useGetMetricTypes } from '../../../dataLayers/hooks/useGetMetrics';
import { useGetInterventionCostBreakdownLineCategories } from '../../../interventions/hooks/useGetInterventionCostBreakdownLineCategories';
import { useGetInterventionCostUnitTypes } from '../../../interventions/hooks/useGetInterventionCostUnitType';
import { useGetInterventionDetails } from '../../../interventions/hooks/useGetInterventionDetails';
import { useSaveInterventionDetails } from '../../../interventions/hooks/useSaveInterventionDetails';
import { InterventionDetails } from '../../../interventions/types';
import { MESSAGES } from '../../../messages';
import { InterventionProvider } from '../contexts/InterventionContext';
import { useGetBudgetSettings } from '../hooks/useGetBudgetSettings';
import { useInterventionFormState } from '../hooks/useInterventionFormState';
import { InterventionForm } from './InterventionForm';

type Props = {
    interventionId?: number;
};

export const InterventionFormWrapper: FC<Props> = ({ interventionId }) => {
    const { formatMessage } = useSafeIntl();

    const { data: interventionCostCategories = [] } =
        useGetInterventionCostBreakdownLineCategories();

    const { data: interventionCostUnitTypes = [] } =
        useGetInterventionCostUnitTypes();

    const { data: metricTypes = [] } = useGetMetricTypes(true);
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

        formik.resetForm({
            values: {
                ...interventionDetails,
            },
        });
    }, [interventionDetails, metricTypes]); // Only run when interventionDetails or metricTypes changes

    return (
        <InterventionProvider
            costCategoryOptions={interventionCostCategories}
            costUnitTypeOptions={interventionCostUnitTypes}
            metricTypes={metricTypes}
            budgetSettings={budgetSettings}
        >
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
                    <InterventionForm />
                </ExtendedFormikProvider>
            </CardStyled>
        </InterventionProvider>
    );
};
