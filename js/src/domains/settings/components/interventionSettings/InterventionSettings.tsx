import React from 'react';
import { Box, Card, CardContent, CardHeader, Typography } from '@mui/material';
import { LoadingSpinner, useSafeIntl } from 'bluesquare-components';
import { useGetInterventionCategories } from '../../../planning/hooks/useGetInterventionCategories';
import { MESSAGES } from '../../messages';

export const InterventionSettings: React.FC = () => {
    const { formatMessage } = useSafeIntl();

    const {
        data: interventionCategories = [],
        isFetching: isLoadingCategories = true,
    } = useGetInterventionCategories();

    if (isLoadingCategories) return <LoadingSpinner />;

    return (
        <Card>
            <CardHeader
                title={formatMessage(MESSAGES.interventionsTitle)}
                subheader={formatMessage(MESSAGES.interventionsSubtitle)}
                titleTypographyProps={{ variant: 'h6' }}
                subheaderTypographyProps={{ variant: 'subtitle1' }}
            ></CardHeader>
            <CardContent>
                {interventionCategories.map(category => (
                    <Box key={category.id} sx={{ marginBottom: 4 }}>
                        <Typography
                            variant="subtitle1"
                            color="textPrimary"
                            sx={{ marginBottom: 0.5, fontWeight: 'bold' }}
                        >
                            {category.name}
                        </Typography>
                        {category.interventions.map(intervention => (
                            <Box
                                key={intervention.id}
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <Typography
                                    variant="subtitle2"
                                    color="textSecondary"
                                >
                                    {intervention.name}
                                </Typography>
                                <Typography
                                    variant="subtitle2"
                                    color="textSecondary"
                                    sx={{ textAlign: 'right' }}
                                >
                                    $00.00
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                ))}
            </CardContent>
        </Card>
    );
};
