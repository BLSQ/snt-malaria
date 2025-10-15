import React, { FC } from 'react';
import { Typography, Grid, Tooltip } from '@mui/material';
import { Intervention } from '../../types/interventions';
import { containerBoxStyles } from '../styles';

const styles = {
    gridContainerStyle: containerBox => {
        return {
            backgroundColor: containerBox.backgroundColor,
            borderRadius: '8px',
            width: 'auto',
            display: 'inline-flex',
            gap: 1,
        };
    },
    interventionGridStyle: isSelectedIntervention => {
        return {
            borderRadius: '4px',
            border: '1px solid',
            borderColor: 'primary.main',
            cursor: 'pointer',
            width: 'auto',
            backgroundColor: isSelectedIntervention
                ? 'primary.main'
                : '#FFFFFF',
            boxShadow: isSelectedIntervention
                ? '0px 4px 4px rgba(0, 0, 0, 0.2)'
                : 'none',
        };
    },
};

type Props = {
    interventionCategoryId: number;
    interventions: Intervention[];
    selectedId: number | null;
    handleSelectIntervention: (
        categoryId: number,
        intervention: Intervention,
    ) => void;
};
export const Interventions: FC<Props> = ({
    interventionCategoryId,
    interventions,
    selectedId,
    handleSelectIntervention,
}) => {
    const selectIntervention = (intervention: Intervention) => {
        handleSelectIntervention(interventionCategoryId, intervention);
    };

    return (
        <Grid
            container
            direction="row"
            padding={1}
            sx={styles.gridContainerStyle(containerBoxStyles)}
        >
            {interventions.map(intervention => {
                const isSelectedIntervention =
                    selectedId && selectedId === intervention.id;
                return (
                    <Tooltip
                        key={intervention.id}
                        title={intervention.description}
                    >
                        <Grid
                            padding={1}
                            onClick={() => selectIntervention(intervention)}
                            sx={styles?.interventionGridStyle?.(
                                isSelectedIntervention,
                            )}
                        >
                            <Typography
                                variant="h6"
                                sx={{
                                    fontSize: '0.8125rem',
                                }}
                                color={
                                    isSelectedIntervention
                                        ? '#FFFFFF'
                                        : 'primary'
                                }
                            >
                                {intervention.name}
                            </Typography>
                        </Grid>
                    </Tooltip>
                );
            })}
        </Grid>
    );
};
