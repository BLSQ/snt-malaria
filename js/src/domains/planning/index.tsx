import React from 'react';
import { Box, AppBar, Toolbar, Typography, Paper, Grid } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';

const styles: SxStyles = {
    appBar: {
        backgroundColor: 'transparent',
        color: 'text.primary',
    },
    container: {
        height: theme => `calc(100vh - ${theme.spacing(8)})`,
        overflow: 'hidden',
        p: 2,
        backgroundColor: 'background.default',
    },
    paperFullHeight: {
        height: theme => `calc(100vh - ${theme.spacing(16)})`,
    },
    paperContainer: {
        height: theme => `calc(100vh - ${theme.spacing(8)})`,
        overflow: 'auto',
    },
};
export const Planning = () => {
    return (
        <>
            <AppBar elevation={0} position="static" sx={styles.appBar}>
                <Toolbar>
                    <Typography variant="h6" color="primary">
                        Planning
                    </Typography>
                </Toolbar>
            </AppBar>
            <Box sx={styles.container}>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <Box sx={styles.paperContainer}>
                            <Paper sx={styles.paperFullHeight}>
                                <Typography
                                    variant="h6"
                                    gutterBottom
                                    color="secondary"
                                >
                                    Map Overview
                                </Typography>
                            </Paper>
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={3.5}>
                        <Box sx={styles.paperContainer}>
                            <Paper sx={styles.paperFullHeight}>
                                <Typography
                                    variant="h6"
                                    gutterBottom
                                    color="secondary"
                                >
                                    INTERVENTIONS
                                </Typography>
                            </Paper>
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={2.5}>
                        <Box sx={styles.paperContainer}>
                            <Paper>
                                <Typography variant="h6" gutterBottom>
                                    INTERVENTIONS PLANS
                                </Typography>
                            </Paper>
                            <Paper sx={{ mt: 2 }}>
                                <Typography variant="h6" gutterBottom>
                                    BUDGETS
                                </Typography>
                            </Paper>
                        </Box>
                    </Grid>
                </Grid>
            </Box>
        </>
    );
};
