import React, { FC, useCallback } from 'react';
import { Grid, Typography } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { Intervention, InterventionCategory } from '../../types/interventions';
import { Interventions } from './Interventions';

type Props = {
    interventionCategories: InterventionCategory[];
    isLoading?: boolean;
    selectedInterventions: { [categoryId: number]: Intervention };
    setSelectedInterventions: React.Dispatch<
        React.SetStateAction<{ [categoryId: number]: Intervention }>
    >;
};

const styles: SxStyles = {
    container: {
        maxHeight: '100%',
        overflow: 'auto',
        flexWrap: 'nowrap',
        padding: 2,
        gap: 2,
    },
    categoryName: { fontSize: '0.75rem', marginBottom: 1 },
    cancelButtonBox: {
        display: 'flex',
        justifyContent: 'flex-end',
    },
};

export const InterventionCategories: FC<Props> = ({
    interventionCategories,
    isLoading = false,
    selectedInterventions,
    setSelectedInterventions,
}) => {
    const toggleIntervention = useCallback(
        (categoryId: number, intervention: Intervention) => {
            setSelectedInterventions((prev = {}) => {
                const { [categoryId]: existingValue, ...rest } = prev;
                return existingValue?.id === intervention.id
                    ? rest
                    : { ...rest, [categoryId]: intervention };
            });
        },
        [setSelectedInterventions],
    );

    return (
        <Grid container direction="column" sx={styles.container}>
            {!isLoading &&
                interventionCategories.map(({ id, name, interventions }) => {
                    return (
                        <Grid item key={id}>
                            <Typography sx={styles.categoryName}>
                                {name}
                            </Typography>
                            <Interventions
                                interventionCategoryId={id}
                                interventions={interventions}
                                selectedId={selectedInterventions[id]?.id}
                                handleSelectIntervention={toggleIntervention}
                            />
                        </Grid>
                    );
                })}
        </Grid>
    );
};
