import React, { FC } from 'react';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import MapIcon from '@mui/icons-material/Map';
import TableRowsIcon from '@mui/icons-material/TableRows';
import { TabList } from '@mui/lab';
import { Box, Button, Grid, Stack, Tab, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { MESSAGES } from '../../../messages';
import { containerBoxStyles } from '../styles';

type Props = {
    setTabValue: (tabValue: string) => void;
    assignedOrgUnits: number;
    totalOrgUnits: number;
};
export const InterventionPlanSummary: FC<Props> = ({
    setTabValue,
    assignedOrgUnits = 0,
    totalOrgUnits = 0,
}) => {
    const { formatMessage } = useSafeIntl();
    return (
        <Grid
            container
            direction="row"
            alignItems="center"
            justifyContent="space-between"
        >
            <Grid item sx={{ flexGrow: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={containerBoxStyles}>
                        <AccountTreeOutlinedIcon
                            height="auto"
                            color="primary"
                        />
                    </Box>

                    <Typography variant="h6" gutterBottom color="#1F2B3D">
                        {formatMessage(MESSAGES.interventionPlanTitle)}
                    </Typography>
                </Stack>
            </Grid>
            <Grid item>
                <Stack
                    direction="row"
                    spacing={2}
                    alignItems="center"
                    sx={{ color: '#1F2B3D99' }}
                >
                    <Typography variant="body2">
                        {assignedOrgUnits} / {totalOrgUnits}
                    </Typography>
                    <TabList
                        onChange={(_event, newValue) => setTabValue(newValue)}
                        sx={{
                            '& .MuiTabs-indicator': {
                                display: 'none',
                            },
                        }}
                    >
                        <Tab
                            value="list"
                            sx={{ minWidth: 0 }}
                            label={<TableRowsIcon />}
                        />
                        <Tab
                            value="map"
                            sx={{ minWidth: 0 }}
                            label={<MapIcon />}
                        />
                    </TabList>
                    <Button variant="contained" color="primary">
                        {formatMessage(MESSAGES.runInterventionPlanBudget)}
                    </Button>
                </Stack>
            </Grid>
        </Grid>
    );
};
