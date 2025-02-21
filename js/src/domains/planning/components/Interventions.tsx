import React, { FC, useState } from 'react';
import { Intervention } from '../types/interventions';
import {
    Typography,
    Grid
} from '@mui/material';

type Props = {
    interventions: Intervention[]
}
export const Interventions: FC<Props> = ({ interventions }) => {
    const [selectedId, setSelectedId] = useState(null);

    const handleSelect = (id) => {
        setSelectedId(id);
    };
    return (<Grid
        container
        direction="row"
        padding={1}
        sx={{
            backgroundColor: "#EDE7F6",
            borderRadius: "8px",
            width: 'auto',
            display: 'inline-flex',
            gap: 1,
        }}
    >
        {interventions.map((intervention) => (
            <Grid
                key={intervention.id}
                padding={1}
                onClick={() => handleSelect(intervention.id)}
                sx={{
                    backgroundColor: selectedId === intervention.id ? "primary.main" : "#FFFFFF",
                    borderRadius: "4px",
                    border: "1px solid",
                    borderColor:  "primary.main",
                    cursor: "pointer",
                    width: 'auto',
                }}
            >
                <Typography
                    variant="h6"
                    sx={{
                        fontSize: "0.8125rem",
                    }}
                    color={selectedId === intervention.id ? "#FFFFFF" : "primary" }
                >
                    {intervention.name}
                </Typography>
            </Grid>
        ))}
    </Grid>)
}