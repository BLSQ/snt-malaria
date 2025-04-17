import React, { FC } from 'react';
import { alpha, Box, Grid, Stack, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { MESSAGES } from '../../messages';

type Props = {
    selectedOrgUnits: OrgUnit[];
};
export const SelectedDistricts: FC<Props> = ({ selectedOrgUnits }) => {
    const { formatMessage } = useSafeIntl();
    return (
        <Grid container padding={2} spacing={2}>
            <Grid item xs={12}>
                <Stack direction="row" spacing={0.5} alignItems="center">
                    <Typography
                        variant="subtitle2"
                        gutterBottom
                        color="#1F2B3D"
                        fontWeight="bold"
                    >
                        0
                    </Typography>
                    <Typography
                        variant="subtitle2"
                        gutterBottom
                        color="#1F2B3D"
                        fontWeight="bold"
                    >
                        {formatMessage(MESSAGES.orgUnitDistrict).toLowerCase()}
                    </Typography>
                </Stack>
            </Grid>
            <Grid item xs={12} display="flex" justifyContent="center">
                {selectedOrgUnits.length > 0 ? (
                    <Typography
                        variant="subtitle2"
                        gutterBottom
                        color="#1F2B3D"
                        fontWeight="bold"
                    >
                        List of selected districts
                    </Typography>
                ) : (
                    <Box padding={4}>
                        <Typography
                            variant="body2"
                            gutterBottom
                            sx={{
                                color: alpha('#1F2B3D', 0.6),
                                fontWeight: 500,
                            }}
                            align="center"
                        >
                            Select districts in the map above and add them to
                            the mix
                        </Typography>
                    </Box>
                )}
            </Grid>
        </Grid>
    );
};
