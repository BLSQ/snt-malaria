import React, { Dispatch, FC, SetStateAction } from 'react';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import MapIcon from '@mui/icons-material/Map';
import TableRowsIcon from '@mui/icons-material/TableRows';
import { Button, Grid, Stack, Tab, Tabs, Typography } from '@mui/material';
import { LoadingSpinner, useSafeIntl } from 'bluesquare-components';
import { IconBoxed } from '../../../../components/IconBoxed';
import { MESSAGES } from '../../../messages';

export type TabValue = 'map' | 'list';
type Props = {
    setTabValue: Dispatch<SetStateAction<TabValue>>;
    tabValue: TabValue;
    onRunBudget: () => void;
    isCalculatingBudget: boolean;
    assignedOrgUnits: number;
    totalOrgUnits: number;
};
export const InterventionPlanSummary: FC<Props> = ({
    setTabValue,
    tabValue,
    onRunBudget,
    isCalculatingBudget,
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
                    <IconBoxed Icon={AccountTreeOutlinedIcon} />

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
                        onClick={onRunBudget}
                        disabled={assignedOrgUnits === 0 || isCalculatingBudget}
                    >
                        {formatMessage(MESSAGES.runInterventionPlanBudget)}
                        {isCalculatingBudget && (
                            <LoadingSpinner
                                size={16}
                                absolute
                                fixed={false}
                                transparent
                            />
                        )}
                    </Button>
                </Stack>
            </Grid>
        </Grid>
    );
};
