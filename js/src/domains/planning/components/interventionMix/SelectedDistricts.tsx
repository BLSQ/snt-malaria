import React, { FC } from 'react';
import { alpha, Box, Button, Grid, Stack, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { MESSAGES } from '../../messages';

type Props = {
    selectedOrgUnits: OrgUnit[];
};
export const SelectedDistricts: FC<Props> = ({ selectedOrgUnits }) => {
    const { formatMessage } = useSafeIntl();
    return (
        <Grid container padding={1} spacing={2}>
            <Grid item container xs={12}>
                <Grid item xs={6}>
                    <Stack
                        direction="row"
                        spacing={0.3}
                        marginTop={1}
                        alignItems="center"
                    >
                        <Typography
                            variant="subtitle2"
                            gutterBottom
                            color="#1F2B3D"
                            fontWeight="bold"
                        >
                            {selectedOrgUnits.length}
                        </Typography>
                        <Typography
                            variant="subtitle2"
                            gutterBottom
                            color="#1F2B3D"
                            fontWeight="bold"
                        >
                            {formatMessage(
                                MESSAGES.orgUnitDistrict,
                            ).toLowerCase()}
                        </Typography>
                    </Stack>
                </Grid>
                <Grid item xs={6}>
                    <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="flex-end"
                    >
                        <Button
                            onClick={() => console.log('Clear selection')}
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
                            color={alpha('#1F2B3D', 0.6)}
                            align="center"
                        >
                            {formatMessage(MESSAGES.selectDistrictsMessage)}
                        </Typography>
                    </Box>
                )}
            </Grid>
        </Grid>
    );
};
