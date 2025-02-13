import React, { FC, useState } from 'react';
import { Toolbar, Typography, Grid } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import {
    PaperContainer,
    PaperFullHeight,
    AppBar,
    PageContainer,
} from '../../components/styledComponents';
import { Budgets } from './components/Budgets';
import { Interventions } from './components/Interventions';
import { InterventionsPlans } from './components/InterventionsPlans';
import { LayersDrawer } from './components/LayersDrawer';
import { Map } from './components/map';
import { useGetOrgUnits } from './hooks/useGetOrgUnits';
import { MESSAGES } from './messages';

export const Planning: FC = () => {
    const { data: orgUnits } = useGetOrgUnits();
    const { formatMessage } = useSafeIntl();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const toggleDrawer = () => {
        setIsDrawerOpen(!isDrawerOpen);
    };
    return (
        <>
            <AppBar elevation={0} position="static">
                <Toolbar>
                    <Typography variant="h6">
                        {formatMessage(MESSAGES.title)}
                    </Typography>
                </Toolbar>
            </AppBar>
            <LayersDrawer
                toggleDrawer={toggleDrawer}
                isDrawerOpen={isDrawerOpen}
            />
            <PageContainer>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <PaperContainer>
                            <PaperFullHeight>
                                <Map
                                    orgUnits={orgUnits}
                                    toggleDrawer={toggleDrawer}
                                />
                            </PaperFullHeight>
                        </PaperContainer>
                    </Grid>
                    <Grid item xs={12} md={3.5}>
                        <PaperContainer>
                            <PaperFullHeight>
                                <Interventions />
                            </PaperFullHeight>
                        </PaperContainer>
                    </Grid>
                    <Grid item xs={12} md={2.5}>
                        <PaperContainer>
                            <InterventionsPlans />
                            <Budgets />
                        </PaperContainer>
                    </Grid>
                </Grid>
            </PageContainer>
        </>
    );
};
