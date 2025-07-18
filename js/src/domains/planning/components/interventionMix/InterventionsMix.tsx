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
    mainMixBox: {
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
    noMixMessage: { color: '#1F2B3D99' },
    createMixButton: { textTransform: 'none' },
    mixStyle: (mixId: number, selectedMix: number) => {
        return {
            height: 'auto',
            display: 'flex',
            flexDirection: {
                xs: 'column',
                sm: 'row',
            },
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: '4px',
            border: theme =>
                `1px solid ${mixId === selectedMix ? theme.palette.primary.main : '#E1E1E1'}`,
            p: 2,
            mt: 2,
            width: '100%',
            boxSizing: 'border-box',
            cursor: 'pointer',
            '&:hover': {
                borderColor: '#000000',
            },
        };
    },
    mixName: {
        fontFamily: 'fontFamily',
        fontWeight: 'bold',
        fontSize: '0.875rem',
        lineHeight: '157%',
        letterSpacing: '0.1px',
        color: '#1F2B3DDE',
    },
    interventionsWrapper: {
        fontFamily: 'fontFamily',
        fontWeight: 'fontWeightRegular',
        fontSize: '0.75rem',
        lineHeight: '166%',
        letterSpacing: '0.4px',
        textAlign: 'right',
        color: '#1F2B3D99',
    },
    dot: {
        display: 'inline-block',
        mx: 0.5,
    },
};

export const InterventionsMix: FC<Props> = ({
    scenarioId,
    selectedOrgUnits,
    setSelectedOrgUnits,
    setSelectedInterventions,
    selectedInterventions,
}) => {
    const [selectedDistricts, setSelectedDistricts] = useState<OrgUnit[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<number[]>([]);

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
        <Box sx={styles.mainMixBox}>
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
