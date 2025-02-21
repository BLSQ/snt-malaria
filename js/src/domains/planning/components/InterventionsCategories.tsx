import React, { FC, useState } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TuneIcon from '@mui/icons-material/Tune';
import {
    Typography,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Grid,
    Divider,
    Stack,
    Badge,
    Button
} from '@mui/material';
import { useGetInterventionCategories } from '../hooks/useGetInterventions';
import { Interventions } from './Interventions';

export const InterventionsCategories: FC = () => {
    const [allSelectedIds, setAllSelectedIds] = useState<number[]>([]);
    const { data: interventionCategories, isLoading: isLoadingInterventionCategories } = useGetInterventionCategories();

    const handleSelectId = (id: number) => {
        setAllSelectedIds((prevIds) => {
            if (prevIds.includes(id)) {
                return prevIds.filter((item) => item !== id);
            }
            return [...prevIds, id];
        });
    };

    return (
        <Accordion>
            <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="interventions-content"
                id="interventions-header"
            >
                <Grid container direction="row" spacing={2} alignItems="center" justifyContent="space-between">

                    <Grid item sx={{ flexGrow: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <TuneIcon color="primary" />
                            <Typography variant="h6" gutterBottom color="#1F2B3D">
                                Intervention mix
                            </Typography>
                        </Stack>

                    </Grid>
                    <Grid item sx={{ mr: 5 }}>
                        <Stack direction="row" spacing={3} alignItems="center">
                            <Typography variant="h6" gutterBottom color="primary">
                                Districts
                            </Typography>
                            <Badge
                                badgeContent={5}
                                sx={{
                                    "& .MuiBadge-badge": {
                                        fontSize: "1.20rem",
                                        minWidth: "28px",
                                        height: "28px",
                                        padding: "4px",
                                        borderRadius: "50%",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }
                                }}
                                color="primary"
                            />
                        </Stack>

                    </Grid>
                </Grid>

            </AccordionSummary>
            <AccordionDetails sx={{ padding: 0 }}>
                <Divider sx={{ width: '100%' }} />
                <Grid container direction="row" spacing={2} padding={2}>
                    {!isLoadingInterventionCategories && interventionCategories.map((interventionCategory) => {
                        return <Grid item direction="column" spacing={2} >
                            <Grid item>
                                <Typography sx={{ fontSize: '0.75rem' }}>{interventionCategory.name}</Typography>
                            </Grid>

                            <Interventions interventionCategoryId={interventionCategory.id} interventions={interventionCategory.interventions} allSelectedIds={allSelectedIds}  // pass the state to the child
                                handleSelectId={handleSelectId} />
                        </Grid>
                    })}
                </Grid>
                <Divider sx={{ width: '100%' }} />
                <Grid item display='flex' justifyContent='flex-end'
                    alignItems='flex-end' padding={2} sx={{
                        height: '68px'
                    }}>
                    <Button
                        variant="contained"
                        color="primary"
                        sx={{ fontSize: '0.875rem', textTransform: 'none' }}
                    >
                        Apply mix and add to plan
                    </Button>
                </Grid>
            </AccordionDetails>
        </Accordion>
    );
};
