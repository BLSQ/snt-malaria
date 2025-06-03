import React, { FC, useCallback, useMemo } from 'react';
import { Box, Button, Grid, TextField, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';
import { useGetInterventionCategories } from '../../hooks/useGetInterventions';
import { MESSAGES } from '../../messages';
import { Interventions } from './Interventions';

type Props = {
    scenarioId?: number;
    selectedOrgUnits: OrgUnit[];
    selectedInterventions: Record<number, number[]>;
    setIsButtonDisabled: (bool: boolean) => void;
    setSelectedInterventions: React.Dispatch<
        React.SetStateAction<Record<number, number[]>>
    >;
    setCreateMix: (bool: boolean) => void;
    mixName: string;
    setMixName: (name: string) => void;
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
    scenarioId,
    selectedOrgUnits,
    selectedInterventions,
    setIsButtonDisabled,
    setSelectedInterventions,
    setCreateMix,
    mixName,
    setMixName,
}) => {
    const { formatMessage } = useSafeIntl();
    const { data: interventionCategories = [], isLoading } =
        useGetInterventionCategories();

    const selectedInterventionValues = useMemo(
        () => Object.values(selectedInterventions).flat().filter(Boolean),
        [selectedInterventions],
    );

    const canApplyInterventions = useMemo(
        () =>
            !!(
                scenarioId &&
                selectedOrgUnits.length &&
                selectedInterventionValues.length
            ),
        [
            scenarioId,
            selectedOrgUnits.length,
            selectedInterventionValues.length,
        ],
    );

    const toggleIntervention = useCallback(
        (categoryId: number, interventionId: number) => {
            if (canApplyInterventions) {
                setIsButtonDisabled(false);
            }

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
        [canApplyInterventions, setIsButtonDisabled, setSelectedInterventions],
    );

    return (
        <Grid container spacing={2} padding={1}>
            <Grid item container spacing={4}>
                <Grid item xs={6}>
                    <TextField
                        label="Mix name"
                        id="outlined-size-small"
                        value={mixName}
                        size="small"
                        sx={styles.mixNameField}
                        onChange={e => setMixName(e.target.value)}
                    />
                </Grid>
                <Grid item xs>
                    <Box sx={styles.cancelButtonBox}>
                        <Button onClick={() => setCreateMix(false)}>
                            {formatMessage(MESSAGES.cancel)}
                        </Button>
                    </Box>
                </Grid>
            </Grid>

            <Grid item container spacing={2} padding={2}>
                {!isLoading &&
                    interventionCategories.map(
                        ({ id, name, interventions }) => (
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
                        ),
                    )}
            </Grid>
        </Grid>
    );
};
