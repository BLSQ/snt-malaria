import React, { Dispatch, FC, SetStateAction } from 'react';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import MapIcon from '@mui/icons-material/Map';
import TableRowsIcon from '@mui/icons-material/TableRows';
import { Box, Button, Grid, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { MESSAGES } from '../../../messages';
import { containerBoxStyles } from '../styles';
import { useCalculateBudget } from '../../hooks/useCalculateBudget';

export type TabValue = 'map' | 'list';
type Props = {
    setTabValue: Dispatch<SetStateAction<TabValue>>;
    tabValue: TabValue;
    assignedOrgUnits: number;
    totalOrgUnits: number;
    scenarioId?: number;
};
export const InterventionPlanSummary: FC<Props> = ({
    setTabValue,
    tabValue,
    assignedOrgUnits = 0,
    totalOrgUnits = 0,
    scenarioId,
}) => {
    const { formatMessage } = useSafeIntl();
    const { mutate: calculateBudget, isLoading: isCalculatingBudget } =
        useCalculateBudget();

    const handleRunBudget = () => {
        if (scenarioId) {
            calculateBudget(scenarioId);
        }
    };
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
                    <Tabs
                        onChange={(_event, newValue) => setTabValue(newValue)}
                        value={tabValue}
                        sx={{
                            '& .MuiTabs-indicator': {
                                display: 'none',
                            },
                        }}
                    >
                        <Tab value="map" label={<MapIcon />} />
                        <Tab value="list" label={<TableRowsIcon />} />
                    </Tabs>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleRunBudget}
                        disabled={!scenarioId || isCalculatingBudget}
                    >
                        {formatMessage(MESSAGES.runInterventionPlanBudget)}
                    </Button>
                </Stack>
            </Grid>
        </Grid>
    );
};
