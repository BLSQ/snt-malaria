import React from 'react';
import EditIcon from '@mui/icons-material/Edit';
import { Box, Card, CardContent, CardHeader, Typography } from '@mui/material';
import { IconButton, LoadingSpinner, useSafeIntl } from 'bluesquare-components';
import { useGetInterventionCategories } from '../../../planning/hooks/useGetInterventionCategories';
import { Intervention } from '../../../planning/types/interventions';
import { MESSAGES } from '../../messages';

export const InterventionSettings: React.FC = () => {
    const { formatMessage } = useSafeIntl();

    const {
        data: interventionCategories = [],
        isFetching: isLoadingCategories = true,
    } = useGetInterventionCategories();

    if (isLoadingCategories) return <LoadingSpinner />;

    function onEditInterventionCost(intervention: Intervention): void {
        console.log('To edit intervention:', intervention.id);
        throw new Error('Function not implemented.');
    }

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
                                    alignItems: 'center',
                                }}
                            >
                                <Typography
                                    variant="subtitle2"
                                    color="textSecondary"
                                >
                                    {intervention.name}
                                </Typography>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Typography
                                        variant="subtitle2"
                                        color="textPrimary"
                                        sx={{
                                            textAlign: 'right',
                                            fontWeight: 'bold',
                                            marginRight: 2,
                                        }}
                                    >
                                        $00.00
                                    </Typography>
                                    <IconButton
                                        onClick={() =>
                                            onEditInterventionCost(intervention)
                                        }
                                        iconSize="small"
                                        tooltipMessage={MESSAGES.editCost}
                                        overrideIcon={EditIcon}
                                    />
                                </Box>
                            </Box>
                        ))}
                    </Box>
                ))}
            </CardContent>
        </Card>
    );
};
