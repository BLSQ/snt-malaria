import React, { FC } from 'react';
import { alpha, Box, Button, Grid, Stack, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { MESSAGES } from '../../messages';
import { SelectedDistrictsTable } from './SelectedDistrictsTable';

type Props = {
    selectedDistricts: OrgUnit[];
    removeDistrict: (id: number) => void;
    clearAllSelectedDistricts: () => void;
};

const BoldSubtitle = ({ children }) => (
    <Typography
        variant="subtitle2"
        gutterBottom
        color="#1F2B3D"
        fontWeight="bold"
    >
        {children}
    </Typography>
);

export const SelectedDistricts: FC<Props> = ({
    selectedDistricts,
    removeDistrict,
    clearAllSelectedDistricts,
}) => {
    const { formatMessage } = useSafeIntl();

    return (
        <>
            <Grid container padding={1} spacing={2}>
                <Grid item xs={6} display="flex" alignItems="center">
                    <Stack direction="row" spacing={0.3} alignItems="center">
                        <BoldSubtitle>{selectedDistricts.length}</BoldSubtitle>
                        <BoldSubtitle>
                            {formatMessage(
                                MESSAGES.orgUnitDistrict,
                            ).toLowerCase()}
                        </BoldSubtitle>
                    </Stack>
                </Grid>
                <Grid item xs={6}>
                    <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="flex-end"
                    >
                        <Button
                            onClick={() => clearAllSelectedDistricts()}
                            color="primary"
                            sx={{
                                textTransform: 'none',
                            }}
                        >
                            {formatMessage(MESSAGES.clearOrgUnitSelection)}
                        </Button>
                    </Box>
                </Grid>
            </Grid>
            <Box sx={{ height: '100%', overflowY: 'auto', padding: 1 }}>
                {selectedDistricts.length > 0 ? (
                    <SelectedDistrictsTable
                        selectedDistricts={selectedDistricts}
                        removeDistrict={removeDistrict}
                    />
                ) : (
                    <Box padding={4}>
                        <Typography
                            variant="body2"
                            gutterBottom
                            color={alpha('#1F2B3D', 0.6)}
                            align="center"
                        >
                            {formatMessage(MESSAGES.selectDistrictsMessage)}
                        </Typography>
                    </Box>
                )}
            </Box>
        </>
    );
};
