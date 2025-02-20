import React, { FC } from 'react';
import { Intervention } from '../types/interventions';
import {
    Typography,
    Grid
} from '@mui/material';

type Props = {
    interventions: Intervention[]
}
export const Interventions: FC<Props> = ({ interventions }) => {
    return (<Grid
        container
        direction="row"
        padding={1}
        sx={{
            display: "inline-flex",
            backgroundColor: "#EDE7F6",
            borderRadius: "8px",
        }}
    >
        {interventions.map((intervention) => (
            <Grid
                item
                key={intervention.id}
                padding={1}
                mr={1}
                sx={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: "4px",
                    border: "1px solid",
                    borderColor: "primary.main",
                }}
            >
                <Typography
                    variant="h6"
                    sx={{
                        fontSize: "0.8125rem",
                    }}
                    color="primary"
                >
                    {intervention.name}
                </Typography>
            </Grid>
        ))}
    </Grid>)
}