import React, { FC, useCallback } from 'react';
import { Grid, Typography } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { useGetInterventionCategories } from '../../hooks/useGetInterventionCategories';
import { Interventions } from './Interventions';

type Props = {
    selectedInterventions: Record<number, number[]>;
    setSelectedInterventions: React.Dispatch<
        React.SetStateAction<Record<number, number[]>>
    >;
};

const styles: SxStyles = {
    categoryName: { fontSize: '0.75rem', marginBottom: 1 },
    mixNameField: { width: '100%' },
    cancelButtonBox: {
        display: 'flex',
        justifyContent: 'flex-end',
    },
};

export const InterventionCategories: FC<Props> = ({
    selectedInterventions,
    setSelectedInterventions,
}) => {
    const { data: interventionCategories = [], isLoading } =
        useGetInterventionCategories();

    const toggleIntervention = useCallback(
        (categoryId: number, interventionId: number) => {
            setSelectedInterventions(prev => {
                const prevSelected = prev[categoryId] || [];
                const isSelected = prevSelected.includes(interventionId);
                return {
                    ...prev,
                    [categoryId]: isSelected
                        ? prevSelected.filter(id => id !== interventionId)
                        : [...prevSelected, interventionId],
                };
            });
        },
        [setSelectedInterventions],
    );

    return (
        <Grid container spacing={2} padding={1}>
            <Grid item container spacing={2} padding={2}>
                {!isLoading &&
                    interventionCategories.map(
                        ({ id, name, interventions }) => {
                            return (
                                <Grid item key={id}>
                                    <Typography sx={styles.categoryName}>
                                        {name}
                                    </Typography>
                                    <Interventions
                                        interventionCategoryId={id}
                                        interventions={interventions}
                                        selectedIds={
                                            selectedInterventions[id] ?? []
                                        }
                                        handleSelectIntervention={
                                            toggleIntervention
                                        }
                                    />
                                </Grid>
                            );
                        },
                    )}
            </Grid>
        </Grid>
    );
};
