import React, { useCallback } from 'react';
import { Box, Card, CardContent, CardHeader, Typography } from '@mui/material';
import { LoadingSpinner, useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { useGetInterventionCategories } from '../../../planning/hooks/useGetInterventionCategories';
import { Intervention } from '../../../planning/types/interventions';
import { UseUpdateInterventionCosts } from '../../hooks/useUpdateInterventionCosts';
import { MESSAGES } from '../../messages';
import { InterventionCostLine } from '../../types/interventionCost';
import { InterventionCostDrawer } from './InterventionCostDrawer';
import { InterventionRow } from './InterventionRow';
import { useGetInterventionCosts } from '../../hooks/useGetInterventionCosts';

const styles: SxStyles = {
    subtitle: { marginBottom: 0.5, fontWeight: 'bold' },
    cardBody: { position: 'relative', minHeight: '150px' },
};

export const InterventionSettings: React.FC = () => {
    const { formatMessage } = useSafeIntl();

    const [interventionCostDrawerOpen, setInterventionCostDrawerOpen] =
        React.useState<boolean>(false);
    const [selectedIntervention, setSelectedIntervention] =
        React.useState<Intervention | null>(null);

    const {
        data: interventionCategories = [],
        isFetching: isLoadingCategories = true,
    } = useGetInterventionCategories();

    const { mutateAsync: updateInterventionCosts } =
        UseUpdateInterventionCosts();

    const onUpdateIntervention = useCallback(
        (intervention: Intervention, costs: InterventionCostLine[]) => {
            updateInterventionCosts({
                intervention: intervention,
                costs,
            }).then(() => {
                setInterventionCostDrawerOpen(false);
                setSelectedIntervention(null);
            });
        },
        [setInterventionCostDrawerOpen, updateInterventionCosts],
    );

    const onEditInterventionCost = useCallback(
        (intervention: Intervention): void => {
            setInterventionCostDrawerOpen(true);
            setSelectedIntervention(intervention);
        },
        [setInterventionCostDrawerOpen, setSelectedIntervention],
    );

    return (
        <>
            <Card>
                <CardHeader
                    title={formatMessage(MESSAGES.interventionsTitle)}
                    subheader={formatMessage(MESSAGES.interventionsSubtitle)}
                    titleTypographyProps={{ variant: 'h6' }}
                    subheaderTypographyProps={{ variant: 'subtitle1' }}
                />
                <CardContent sx={styles.cardBody}>
                    {isLoadingCategories ? (
                        <LoadingSpinner absolute={true} />
                    ) : (
                        interventionCategories.map(category => (
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
                        ))
                    )}
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
