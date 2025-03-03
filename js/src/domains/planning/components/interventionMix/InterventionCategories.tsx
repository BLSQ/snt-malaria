import React, { FC, useCallback, useMemo, useState } from 'react';
import { Button, Divider, Grid, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { useQueryClient } from 'react-query';
import { UseCreateInterventionAssignment } from '../../hooks/UseCreateInterventionAssignment';
import { useGetInterventionCategories } from '../../hooks/useGetInterventions';
import { MESSAGES } from '../../messages';
import { Interventions } from './Interventions';

type Props = {
    scenarioId: number | undefined;
    selectedOrgUnits: any;
};

export const InterventionCategories: FC<Props> = ({
    scenarioId,
    selectedOrgUnits,
}) => {
    const { formatMessage } = useSafeIntl();
    const [selectedInterventions, setSelectedInterventions] = useState<{
        [categoryId: number]: number[] | [];
    }>({});
    const [isButtonDisabled, setIsButtonDisabled] = useState<boolean>(false);

    const {
        data: interventionCategories,
        isLoading: isLoadingInterventionCategories,
    } = useGetInterventionCategories();

    const selectedInterventionValues = useMemo(
        () =>
            Object.values(selectedInterventions)
                .flat()
                .filter(value => value !== null),
        [selectedInterventions],
    );
    const canApplyInterventions = useMemo(() => {
        return (
            selectedInterventionValues.length > 0 &&
            selectedOrgUnits.length > 0 &&
            scenarioId
        );
    }, [
        scenarioId,
        selectedInterventionValues.length,
        selectedOrgUnits.length,
    ]);

    const handleSelectIntervention = useCallback(
        (categoryId: number, interventionId: number) => {
            if (canApplyInterventions) {
                setIsButtonDisabled(false);
            }

            setSelectedInterventions(prev => {
                const prevInterventions = prev[categoryId]
                    ? [...prev[categoryId]]
                    : [];
                if (prevInterventions.includes(interventionId)) {
                    const filteredInterventions = prevInterventions.filter(
                        id => id !== interventionId,
                    );
                    return { ...prev, [categoryId]: filteredInterventions };
                }
                return {
                    ...prev,
                    [categoryId]: [...prevInterventions, interventionId],
                };
            });
        },
        [canApplyInterventions],
    );

    const { mutateAsync: createInterventionAssignment } =
        UseCreateInterventionAssignment();

    const queryClient = useQueryClient();
    const handleAssignmentCreation = async () => {
        if (canApplyInterventions) {
            setIsButtonDisabled(true);

            await createInterventionAssignment({
                intervention_ids: selectedInterventionValues,
                org_unit_ids: selectedOrgUnits.map(orgUnit => orgUnit.id),
                scenario_id: scenarioId,
            });

            queryClient.invalidateQueries(['interventionPlans']);
        }
    };
    return (
        <>
            <Grid container direction="row" spacing={2} padding={2}>
                {!isLoadingInterventionCategories &&
                    interventionCategories?.map(interventionCategory => {
                        return (
                            <Grid item key={interventionCategory.id}>
                                <Grid item>
                                    <Typography
                                        sx={{
                                            fontSize: '0.75rem',
                                        }}
                                    >
                                        {interventionCategory.name}
                                    </Typography>
                                </Grid>

                                <Interventions
                                    interventionCategoryId={
                                        interventionCategory.id
                                    }
                                    interventions={
                                        interventionCategory.interventions
                                    }
                                    selectedIds={
                                        selectedInterventions[
                                            interventionCategory.id
                                        ] ?? []
                                    }
                                    handleSelectIntervention={
                                        handleSelectIntervention
                                    }
                                />
                            </Grid>
                        );
                    })}
            </Grid>
            <Divider sx={{ width: '100%' }} />
            <Grid
                item
                display="flex"
                justifyContent="flex-end"
                alignItems="flex-end"
                padding={2}
                sx={{
                    height: '68px',
                }}
            >
                <Button
                    onClick={() => handleAssignmentCreation()}
                    variant="contained"
                    color="primary"
                    sx={{
                        fontSize: '0.875rem',
                        textTransform: 'none',
                    }}
                    disabled={!canApplyInterventions || isButtonDisabled}
                >
                    {formatMessage(MESSAGES.applyMixAndAddPlan)}
                </Button>
            </Grid>
        </>
    );
};
