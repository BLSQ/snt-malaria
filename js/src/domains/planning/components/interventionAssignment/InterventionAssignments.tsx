import React, { FC, useCallback, useEffect, useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    CardHeader,
    Divider,
    Grid,
} from '@mui/material';
import { LoadingSpinner } from 'bluesquare-components';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';
import { useCreateInterventionAssignment } from '../../hooks/useCreateInterventionAssignment';
import { useGetInterventionCategories } from '../../hooks/useGetInterventionCategories';
import { Intervention, InterventionPlan } from '../../types/interventions';
import { InterventionCategories } from './InterventionCategories';
import { InterventionHeader } from './InterventionHeader';
import { SelectedDistricts } from './SelectedDistricts';

type Props = {
    scenarioId: number | undefined;
    selectedOrgUnits: OrgUnit[];
    setSelectedOrgUnits: any;
    setSelectedInterventions: React.Dispatch<
        React.SetStateAction<{ [categoryId: number]: Intervention }>
    >;
    selectedInterventions: { [categoryId: number]: Intervention };
    interventionPlans: InterventionPlan[];
};

const styles: SxStyles = {
    mainBox: {
        borderRadius: theme => theme.spacing(2),
        overflow: 'hidden',
        height: '493px',
        position: 'relative',
    },
    card: { height: '100%', display: 'flex', flexDirection: 'column' },
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
    setSelectedOrgUnits,
    setSelectedInterventions,
    selectedInterventions,
    interventionPlans,
}) => {
    const [selectedDistricts, setSelectedDistricts] = useState<OrgUnit[]>([]);

    useEffect(() => {
        setSelectedDistricts(selectedOrgUnits);
    }, [selectedOrgUnits]);

    const removeDistrict = useCallback(
        id => {
            setSelectedOrgUnits(prev =>
                prev.filter(district => district.id !== id),
            );
        },
        [setSelectedOrgUnits],
    );

    const clearAllSelectedDistricts = useCallback(
        () => setSelectedOrgUnits([]),
        [setSelectedOrgUnits],
    );

    const { data: interventionCategories = [], isLoading } =
        useGetInterventionCategories();

    const {
        mutateAsync: createInterventionAssignment,
        isLoading: isCreatingAssignment,
    } = useCreateInterventionAssignment();

    return (
        <Box sx={styles.mainBox}>
            <Card elevation={2} sx={styles.card}>
                {isCreatingAssignment && <LoadingSpinner absolute />}
                <CardHeader
                    title={
                        <InterventionHeader
                            interventionCategories={interventionCategories}
                            scenarioId={scenarioId}
                            selectedOrgUnits={selectedDistricts}
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
                    <Grid container sx={styles.districtsContainer}>
                        <Grid item md={7} xs={12} sx={styles.districtsItem}>
                            <SelectedDistricts
                                selectedDistricts={selectedDistricts}
                                removeDistrict={removeDistrict}
                                clearAllSelectedDistricts={
                                    clearAllSelectedDistricts
                                }
                            />
                        </Grid>
                        <Grid item md={5} xs={12} sx={styles.interventionsItem}>
                            <InterventionCategories
                                interventionCategories={interventionCategories}
                                isLoading={isLoading}
                                selectedInterventions={selectedInterventions}
                                setSelectedInterventions={
                                    setSelectedInterventions
                                }
                            />
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
        </Box>
    );
};
