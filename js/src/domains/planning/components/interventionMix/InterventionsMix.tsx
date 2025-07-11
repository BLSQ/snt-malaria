import React, { FC, useCallback, useEffect, useState } from 'react';
import {
    alpha,
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Divider,
    Grid,
    Typography,
} from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';
import { useGetInterventionMixes } from '../../hooks/useGetInterventionMixes';
import { MESSAGES } from '../../messages';
import { InterventionCategories } from './InterventionCategories';
import { InterventionMixSummary } from './InterventionMixSummary';
import { SelectedDistricts } from './SelectedDistricts';

type Props = {
    scenarioId: number | undefined;
    selectedOrgUnits: OrgUnit[];
    setSelectedOrgUnits: any;
    setSelectedInterventions: any;
    selectedInterventions: any;
    mixName: string;
    setMixName: (name: string) => void;
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
const InterventionList = ({ interventions }) => (
    <>
        {interventions.map((intervention, idx) => (
            <Typography
                key={intervention.name}
                variant="caption"
                color={alpha('#1F2B3D', 0.87)}
                component="span"
            >
                {intervention.name}
                {idx < interventions.length - 1 && (
                    <Box component="span" sx={styles.dot}>
                        ·
                    </Box>
                )}
            </Typography>
        ))}
    </>
);

export const InterventionsMix: FC<Props> = ({
    scenarioId,
    selectedOrgUnits,
    setSelectedOrgUnits,
    setSelectedInterventions,
    selectedInterventions,
    mixName,
    setMixName,
}) => {
    const { formatMessage } = useSafeIntl();

    const [selectedDistricts, setSelectedDistricts] = useState<OrgUnit[]>([]);
    const [createMix, setCreateMix] = useState<boolean>(false);
    const [selectedMix, setSelectedMix] = useState<number | null>(null);

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

    const { data: interventionMixes } = useGetInterventionMixes(scenarioId);

    return (
        <Box sx={styles.mainMixBox}>
            <Card elevation={2} sx={styles.card}>
                <CardHeader
                    title={
                        <InterventionMixSummary
                            scenarioId={scenarioId}
                            selectedOrgUnits={selectedDistricts}
                            selectedInterventions={selectedInterventions}
                            mixName={mixName}
                            setCreateMix={setCreateMix}
                            selectedMix={selectedMix}
                            setSelectedMix={setSelectedMix}
                            setMixName={setMixName}
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
                            {createMix ? (
                                <InterventionCategories
                                    selectedInterventions={
                                        selectedInterventions
                                    }
                                    setSelectedInterventions={
                                        setSelectedInterventions
                                    }
                                    setCreateMix={setCreateMix}
                                    mixName={mixName}
                                    setMixName={setMixName}
                                />
                            ) : (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        height: '100%',
                                    }}
                                >
                                    <Grid container spacing={2} px={2}>
                                        <Grid
                                            item
                                            xs={6}
                                            display="flex"
                                            alignItems="center"
                                        >
                                            <Typography
                                                variant="body2"
                                                sx={styles.noMixMessage}
                                            >
                                                {formatMessage(
                                                    (interventionMixes?.length ??
                                                        0) > 0
                                                        ? MESSAGES.chooseMixToApply
                                                        : MESSAGES.noMixCreated,
                                                )}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Box
                                                display="flex"
                                                alignItems="center"
                                                justifyContent="flex-end"
                                            >
                                                <Button
                                                    sx={styles.createMixButton}
                                                    onClick={() => {
                                                        setCreateMix(true);
                                                        setSelectedMix(null);
                                                    }}
                                                >
                                                    {formatMessage(
                                                        MESSAGES.createNewMix,
                                                    )}
                                                </Button>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                    <Grid
                                        sx={{ flexGrow: 1, overflow: 'auto' }}
                                    >
                                        {interventionMixes?.map(mix => (
                                            <Box
                                                key={mix.name}
                                                onClick={() =>
                                                    setSelectedMix(mix.id)
                                                }
                                                sx={styles.mixStyle(
                                                    mix.id,
                                                    selectedMix,
                                                )}
                                            >
                                                <Typography
                                                    variant="subtitle2"
                                                    sx={styles.mixName}
                                                >
                                                    {mix.name}
                                                </Typography>
                                                <Typography
                                                    sx={
                                                        styles.interventionsWrapper
                                                    }
                                                >
                                                    <InterventionList
                                                        interventions={
                                                            mix.interventions
                                                        }
                                                    />
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Grid>
                                </Box>
                            )}
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
        </Box>
    );
};
