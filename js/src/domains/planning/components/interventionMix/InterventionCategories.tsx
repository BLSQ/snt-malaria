import React, { FC, useCallback, useMemo, useState } from 'react';
import { Button, Divider, Grid, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { useGetInterventionCategories } from '../../hooks/useGetInterventions';
import { MESSAGES } from '../../messages';
import { Interventions } from './Interventions';

export const InterventionCategories: FC = () => {
    const { formatMessage } = useSafeIntl();
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

    const selectedInterventionValues = useMemo(
        () =>
            Object.values(selectedInterventions).filter(
                value => value !== null,
            ),
        [selectedInterventions],
    );

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
                    onClick={() => {
                        console.log('hello');
                    }}
                    variant="contained"
                    color="primary"
                    sx={{
                        fontSize: '0.875rem',
                        textTransform: 'none',
                    }}
                    disabled={selectedInterventionValues.length === 0}
                >
                    {formatMessage(MESSAGES.applyMixAndAddPlan)}
                </Button>
            </Grid>
        </>
    );
};
