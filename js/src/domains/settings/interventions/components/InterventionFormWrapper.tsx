import React, { FC, useCallback, useEffect, useMemo } from 'react';
import CheckIcon from '@mui/icons-material/Check';
import { Button, Stack, Typography } from '@mui/material';
import { LoadingSpinner, useSafeIntl } from 'bluesquare-components';
import { CardStyled } from '../../../../components/CardStyled';
import { SettingsFormContainer } from '../../../../components/styledComponents';
import { ExtendedFormikProvider } from '../../../../hooks/useGetExtendedFormikContext';
import { useGetMetricTypes } from '../../../dataLayers/hooks/useGetMetrics';
import { useGetInterventionCostBreakdownLineCategories } from '../../../interventions/hooks/useGetInterventionCostBreakdownLineCategories';
import { useGetInterventionCostUnitTypes } from '../../../interventions/hooks/useGetInterventionCostUnitType';
import { useGetInterventionDetails } from '../../../interventions/hooks/useGetInterventionDetails';
import { useSaveInterventionDetails } from '../../../interventions/hooks/useSaveInterventionDetails';
import { InterventionDetails } from '../../../interventions/types';
import { MESSAGES } from '../../../messages';
import { useGetGrants } from '../../grants/hooks/useGetGrants';
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
    const { data: grants = [] } = useGetGrants();

    const grantOptions = useMemo(
        () =>
            grants.map(grant => ({
                label: grant.name,
                value: grant.id,
            })),
        [grants],
    );

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
            grantOptions={grantOptions}
            metricTypes={metricTypes}
            budgetSettings={budgetSettings}
        >
            <CardStyled
                header={
                    <Stack direction="row" justifyContent="space-between">
                        <Typography variant="h6">
                            {interventionDetails?.name}
                        </Typography>
                        <Button
                            onClick={() => formik.handleSubmit()}
                            variant="contained"
                            color="primary"
                            startIcon={<CheckIcon />}
                            disabled={isSavingInterventionDetails}
                        >
                            {formatMessage(MESSAGES.save)}
                        </Button>
                    </Stack>
                }
            >
                {isFetchingInterventionDetails && (
                    <LoadingSpinner absolute={true} />
                )}

                <ExtendedFormikProvider formik={formik}>
                    <SettingsFormContainer>
                        <InterventionForm />
                    </SettingsFormContainer>
                </ExtendedFormikProvider>
            </CardStyled>
        </InterventionProvider>
    );
};
