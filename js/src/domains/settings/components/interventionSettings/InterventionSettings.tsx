import React, { useCallback } from 'react';
import { Box, Card, CardContent, CardHeader, Typography } from '@mui/material';
import { LoadingSpinner, useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { useGetInterventionCategories } from '../../../planning/hooks/useGetInterventionCategories';
import { UseUpdateIntervention } from '../../../planning/hooks/UseUpdateIntervention';
import { Intervention } from '../../../planning/types/interventions';
import { MESSAGES } from '../../messages';
import { InterventionCostDrawer } from './InterventionCostDrawer';
import { InterventionRow } from './InterventionRow';

const styles: SxStyles = {
    subtitle: { marginBottom: 0.5, fontWeight: 'bold' },
};

export const InterventionSettings: React.FC = () => {
    const { formatMessage } = useSafeIntl();

    const [interventionCostDrawerOpen, setInterventionCostDrawerOpen] =
        React.useState(false);
    const [selectedIntervention, setSelectedIntervention] =
        React.useState<Intervention | null>(null);

    const {
        data: interventionCategories = [],
        isFetching: isLoadingCategories = true,
    } = useGetInterventionCategories();

    const { mutateAsync: updateIntervention } = UseUpdateIntervention();

    const onUpdateIntervention = useCallback(
        (intervention: Intervention) => {
            updateIntervention(intervention).then(() => {
                setInterventionCostDrawerOpen(false);
                setSelectedIntervention(null);
            });
        },
        [updateIntervention, setInterventionCostDrawerOpen],
    );

    const onEditInterventionCost = useCallback(
        (intervention: Intervention): void => {
            setInterventionCostDrawerOpen(true);
            setSelectedIntervention(intervention);
        },
        [setInterventionCostDrawerOpen, setSelectedIntervention],
    );

    return isLoadingCategories ? (
        <LoadingSpinner />
    ) : (
        <>
            <Card>
                <CardHeader
                    title={formatMessage(MESSAGES.interventionsTitle)}
                    subheader={formatMessage(MESSAGES.interventionsSubtitle)}
                    titleTypographyProps={{ variant: 'h6' }}
                    subheaderTypographyProps={{ variant: 'subtitle1' }}
                />
                <CardContent>
                    {interventionCategories.map(category => (
                        <Box key={category.id} sx={{ marginBottom: 4 }}>
                            <Typography
                                variant="subtitle1"
                                color="textPrimary"
                                sx={styles.subtitle}
                            >
                                {category.name}
                            </Typography>
                            {category.interventions.map(intervention => (
                                <InterventionRow
                                    key={intervention.id}
                                    intervention={intervention}
                                    onEditInterventionCost={
                                        onEditInterventionCost
                                    }
                                />
                            ))}
                        </Box>
                    ))}
                </CardContent>
            </Card>
            <InterventionCostDrawer
                open={interventionCostDrawerOpen}
                onClose={() => setInterventionCostDrawerOpen(false)}
                intervention={selectedIntervention}
                onConfirm={onUpdateIntervention}
            />
        </>
    );
};
