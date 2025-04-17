import React, { FC, useCallback, useMemo } from 'react';
import { Grid, Typography } from '@mui/material';
import { useGetInterventionCategories } from '../../hooks/useGetInterventions';
import { Interventions } from './Interventions';

type Props = {
    scenarioId: number | undefined;
    selectedOrgUnits: any;
    selectedInterventions: { [categoryId: number]: number[] | [] };
    setIsButtonDisabled: (bool: boolean) => void;
    setSelectedInterventions: React.Dispatch<
        React.SetStateAction<{ [categoryId: number]: number[] | [] }>
    >;
};

export const InterventionCategories: FC<Props> = ({
    scenarioId,
    selectedOrgUnits,
    selectedInterventions,
    setIsButtonDisabled,
    setSelectedInterventions,
}) => {
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
        [canApplyInterventions, setIsButtonDisabled, setSelectedInterventions],
    );

    return (
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
                                interventionCategoryId={interventionCategory.id}
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
    );
};
