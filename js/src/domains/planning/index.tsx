import React, { FC } from 'react';
import { Box, Toolbar, Typography, Paper, Grid } from '@mui/material';
import {
    PaperContainer,
    PaperFullHeight,
    AppBar,
    PageContainer,
} from '../../components/styledComponents';
import { Map } from './components/map';
import { useGetOrgUnits } from './hooks/useGetOrgUnits';

export const Planning: FC = () => {
    const { data: orgUnits } = useGetOrgUnits();
    return (
        <>
            <AppBar elevation={0} position="static">
                <Toolbar>
                    <Typography variant="h6">Planning</Typography>
                </Toolbar>
            </AppBar>
            <PageContainer>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <PaperContainer>
                            <PaperFullHeight>
                                <Map orgUnits={orgUnits} />
                            </PaperFullHeight>
                        </PaperContainer>
                    </Grid>
                    <Grid item xs={12} md={3.5}>
                        <PaperContainer>
                            <PaperFullHeight>
                                <Box p={2}>
                                    <Typography
                                        variant="h6"
                                        gutterBottom
                                        color="secondary"
                                    >
                                        INTERVENTIONS
                                    </Typography>
                                </Box>
                            </PaperFullHeight>
                        </PaperContainer>
                    </Grid>
                    <Grid item xs={12} md={2.5}>
                        <PaperContainer>
                            <Paper>
                                <Box p={2}>
                                    <Typography
                                        variant="h6"
                                        gutterBottom
                                        color="secondary"
                                    >
                                        INTERVENTIONS PLANS
                                    </Typography>
                                </Box>
                            </Paper>
                            <Paper sx={{ mt: 2 }}>
                                <Box p={2}>
                                    <Typography
                                        variant="h6"
                                        gutterBottom
                                        color="secondary"
                                    >
                                        BUDGETS
                                    </Typography>
                                </Box>
                            </Paper>
                        </PaperContainer>
                    </Grid>
                </Grid>
            </PageContainer>
        </>
    );
};
