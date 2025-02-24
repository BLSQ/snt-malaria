import React, { FC } from 'react';
import { Typography, Grid } from '@mui/material';

const gridContainerStyle = {
    backgroundColor: '#EDE7F6',
    borderRadius: '8px',
    width: 'auto',
    display: 'inline-flex',
    gap: 1,
};

const interventionGridStyle = (interventionId, selectedId) => {
    return {
        backgroundColor:
            selectedId === interventionId ? 'primary.main' : '#FFFFFF',
        borderRadius: '4px',
        border: '1px solid',
        borderColor: 'primary.main',
        cursor: 'pointer',
        width: 'auto',
        boxShadow:
            selectedId === interventionId
                ? '0px 4px 4px rgba(0, 0, 0, 0.2)'
                : 'none',
    };
};

type Props = {
    interventionCategoryId: number;
    interventions: { id: number; name: string }[];
    selectedId: number | null;
    handleSelectIntervention: (
        categoryId: number,
        interventionId: number,
    ) => void;
};
export const Interventions: FC<Props> = ({
    interventionCategoryId,
    interventions,
    selectedId,
    handleSelectIntervention,
}) => {
    const selectIntervention = (id: number) => {
        handleSelectIntervention(interventionCategoryId, id);
    };

    return (
        <Grid container direction="row" padding={1} sx={gridContainerStyle}>
            {interventions.map(intervention => (
                <Grid
                    key={intervention.id}
                    padding={1}
                    onClick={() => selectIntervention(intervention.id)}
                    sx={interventionGridStyle(intervention.id, selectedId)}
                >
                    <Typography
                        variant="h6"
                        sx={{
                            fontSize: '0.8125rem',
                        }}
                        color={
                            selectedId === intervention.id
                                ? '#FFFFFF'
                                : 'primary'
                        }
                    >
                        {intervention.name}
                    </Typography>
                </Grid>
            ))}
        </Grid>
    );
};
