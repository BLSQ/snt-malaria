import React, { FC } from 'react';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import MapIcon from '@mui/icons-material/Map';
import SearchIcon from '@mui/icons-material/Search';
import TableRowsIcon from '@mui/icons-material/TableRows';
import { TabList } from '@mui/lab';
import {
    Box,
    Grid,
    InputAdornment,
    Stack,
    Tab,
    TextField,
    Typography,
} from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { MESSAGES } from '../../messages';
import { containerBoxStyles } from '../styles';

type Props = {
    setTabValue: (tabValue: string) => void;
};
export const InterventionPlanSummary: FC<Props> = ({ setTabValue }) => {
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
                    spacing={4}
                    alignItems="center"
                    sx={{ color: '#1F2B3D99' }}
                >
                    <TabList
                        onChange={(event, newValue) => setTabValue(newValue)}
                        sx={{
                            '& .MuiTabs-indicator': {
                                display: 'none',
                            },
                        }}
                    >
                        <Tab value="list" label={<TableRowsIcon />} />
                        <Tab value="map" label={<MapIcon />} />
                    </TabList>

                    <TextField
                        id="search-field"
                        placeholder="Districts"
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                        }}
                        sx={{
                            width: 200,
                            '& .MuiInputBase-root': {
                                height: 30,
                            },
                        }}
                    />
                </Stack>
            </Grid>
        </Grid>
    );
};
