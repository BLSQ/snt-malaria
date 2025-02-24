import React, { FC, useCallback, useState } from 'react';
import { Grid, Typography } from '@mui/material';
import { useGetInterventionCategories } from '../../hooks/useGetInterventions';
import { Interventions } from './Interventions';

export const InterventionCategories: FC = () => {
    const [selectedInterventions, setSelectedInterventions] = useState<{
        [categoryId: number]: number | null;
    }>({});

    const {
        data: interventionCategories,
        isLoading: isLoadingInterventionCategories,
    } = useGetInterventionCategories();

    const handleSelectIntervention = useCallback(
        (categoryId: number, interventionId: number) => {
            setSelectedInterventions(prev => ({
                ...prev,
                [categoryId]:
                    prev[categoryId] === interventionId ? null : interventionId,
            }));
        },
        [],
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
                                selectedId={
                                    selectedInterventions[
                                        interventionCategory.id
                                    ] ?? null
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
