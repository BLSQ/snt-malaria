import React, { FC, useState } from 'react';
import { Intervention } from '../types/interventions';
import {
    Typography,
    Grid
} from '@mui/material';

type Props = {
    interventions: Intervention[];
    allSelectedIds: number[];
    handleSelectId: (id: number) => void;
}
export const Interventions: FC<Props> = ({ interventions, allSelectedIds, handleSelectId }) => {
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const handleSelect = (id) => {
        setSelectedId((prevId) => (prevId === id ? null : id));
        handleSelectId(id);
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
                    boxShadow: selectedId === intervention.id ? '0px 4px 4px rgba(0, 0, 0, 0.2)' : 'none'
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