import React, { FC, useCallback, useEffect, useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    CardHeader,
    Divider,
    Grid,
} from '@mui/material';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';
import { InterventionCategories } from './InterventionCategories';
import { InterventionHeader } from './InterventionHeader';
import { SelectedDistricts } from './SelectedDistricts';

type Props = {
    scenarioId: number | undefined;
    selectedOrgUnits: OrgUnit[];
    setSelectedOrgUnits: any;
    setSelectedInterventions: any;
    selectedInterventions: any;
};

const styles: SxStyles = {
    mainBox: {
        borderRadius: theme => theme.spacing(2),
        overflow: 'hidden',
        height: '493px',
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

    return (
        <Box sx={styles.mainBox}>
            <Card elevation={2} sx={styles.card}>
                <CardHeader
                    title={
                        <InterventionHeader
                            scenarioId={scenarioId}
                            selectedOrgUnits={selectedDistricts}
                            selectedInterventions={selectedInterventions}
                            setSelectedInterventions={setSelectedInterventions}
                        />
                    }
                />
                <CardContent sx={styles.cardContent}>
                    <Divider sx={styles.horizontalDivider} />
                    <Grid container sx={styles.districtsContainer}>
                        <Grid item sx={styles.districtsItem}>
                            <SelectedDistricts
                                selectedDistricts={selectedDistricts}
                                removeDistrict={removeDistrict}
                                clearAllSelectedDistricts={
                                    clearAllSelectedDistricts
                                }
                            />
                        </Grid>

                        <Divider
                            orientation="vertical"
                            flexItem
                            sx={styles.verticalDivider}
                        />

                        <Grid item sx={styles.interventionsItem}>
                            <InterventionCategories
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
