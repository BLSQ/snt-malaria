import React, { FC } from 'react';
import { Card, CardContent, CardHeader, Divider } from '@mui/material';
import { LoadingSpinner } from 'bluesquare-components';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';
import { useCreateInterventionAssignment } from '../../hooks/useCreateInterventionAssignment';
import { useGetInterventionCategories } from '../../hooks/useGetInterventionCategories';
import { Intervention, InterventionPlan } from '../../types/interventions';
import { InterventionCategories } from './InterventionCategories';
import { InterventionHeader } from './InterventionHeader';

type Props = {
    scenarioId: number | undefined;
    selectedOrgUnits: OrgUnit[];
    setSelectedInterventions: React.Dispatch<
        React.SetStateAction<{ [categoryId: number]: Intervention }>
    >;
    selectedInterventions: { [categoryId: number]: Intervention };
    interventionPlans: InterventionPlan[];
};

const styles: SxStyles = {
    card: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        borderRadius: theme => theme.spacing(2),
        boxShadow: 'none',
    },
    cardContent: {
        padding: 0,
        height: '100%',
        overflow: 'hidden',
        '&:last-child': {
            paddingBottom: 0,
        },
    },
    horizontalDivider: { width: '100%', mb: 0 },
    districtsContainer: {
        padding: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
    },
    districtsItem: {
        width: '50%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid rgba(0, 0, 0, 0.12)',
    },
    verticalDivider: { bgcolor: 'grey.300' },
    interventionsItem: {
        width: '49%',
        overflow: 'auto',
        padding: 1,
        height: '100%',
    },
};

export const InterventionAssignments: FC<Props> = ({
    scenarioId,
    selectedOrgUnits,
    setSelectedInterventions,
    selectedInterventions,
    interventionPlans,
}) => {
    const { data: interventionCategories = [], isLoading } =
        useGetInterventionCategories();

    const {
        mutateAsync: createInterventionAssignment,
        isLoading: isCreatingAssignment,
    } = useCreateInterventionAssignment({ showDiffSnackbar: true });

    return (
        <Card elevation={2} sx={styles.card}>
            {isCreatingAssignment && <LoadingSpinner absolute />}
            <CardHeader
                title={
                    <InterventionHeader
                        interventionCategories={interventionCategories}
                        scenarioId={scenarioId}
                        selectedOrgUnits={selectedOrgUnits}
                        selectedInterventions={selectedInterventions}
                        setSelectedInterventions={setSelectedInterventions}
                        interventionPlans={interventionPlans}
                        onCreateInterventionAssignments={
                            createInterventionAssignment
                        }
                    />
                }
            />
            <CardContent sx={styles.cardContent}>
                <Divider sx={styles.horizontalDivider} />
                <InterventionCategories
                    interventionCategories={interventionCategories}
                    isLoading={isLoading}
                    selectedInterventions={selectedInterventions}
                    setSelectedInterventions={setSelectedInterventions}
                />
            </CardContent>
        </Card>
    );
};
