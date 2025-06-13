import React, { FC, useCallback } from 'react';
import { Box, Button, Grid, TextField, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { useGetInterventionCategories } from '../../hooks/useGetInterventions';
import { MESSAGES } from '../../messages';
import { Interventions } from './Interventions';

type Props = {
    selectedInterventions: Record<number, number[]>;
    setSelectedInterventions: React.Dispatch<
        React.SetStateAction<Record<number, number[]>>
    >;
    setCreateMix?: (bool: boolean) => void;
    mixName?: string;
    setMixName?: (name: string) => void;
    edit?: boolean;
    mix?: any;
};

const styles: SxStyles = {
    categoryName: { fontSize: '0.75rem' },
    mixNameField: { width: '100%' },
    cancelButtonBox: {
        display: 'flex',
        justifyContent: 'flex-end',
    },
};

export const InterventionCategories: FC<Props> = ({
    selectedInterventions,
    setSelectedInterventions,
    setCreateMix,
    mixName,
    setMixName,
    edit,
    mix,
}) => {
    const { formatMessage } = useSafeIntl();
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
            <Grid item container spacing={4}>
                <Grid item xs={edit ? 12 : 6}>
                    <TextField
                        label="Mix name"
                        id="outlined-size-small"
                        value={mixName}
                        size="small"
                        sx={styles.mixNameField}
                        onChange={e => setMixName?.(e.target.value)}
                    />
                </Grid>
                {!edit && (
                    <Grid item xs>
                        <Box sx={styles.cancelButtonBox}>
                            <Button
                                onClick={() => {
                                    setCreateMix?.(false);
                                    setMixName?.('');
                                    setSelectedInterventions([]);
                                }}
                            >
                                {formatMessage(MESSAGES.cancel)}
                            </Button>
                        </Box>
                    </Grid>
                )}
            </Grid>

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
