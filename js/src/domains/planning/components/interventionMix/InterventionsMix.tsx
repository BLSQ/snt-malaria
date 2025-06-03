import React, { FC, useCallback, useEffect, useState } from 'react';
import {
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
import { MESSAGES } from '../../messages';
import { InterventionCategories } from './InterventionCategories';
import { InterventionMixSummary } from './InterventionMixSummary';
import { SelectedDistricts } from './SelectedDistricts';

type Props = {
    scenarioId: number | undefined;
    selectedOrgUnits: OrgUnit[];
};

const styles: SxStyles = {
    mainMixBox: {
        borderRadius: theme => theme.spacing(2),
        overflow: 'hidden',
        height: '493px',
    },
    card: { minHeight: '424px' },
    cardContent: {
        padding: 0,
        '&:last-child': {
            paddingBottom: 0,
        },
    },
    horizontalDivider: { width: '100%', mb: 0 },
    districtsContainer: {
        padding: 0,
        height: '424px',
        width: '100%',
        display: 'flex',
    },
    districtsItem: {
        width: '50%',
        height: '100%',
        overflow: 'auto',
    },
    verticalDivider: { bgcolor: 'grey.300' },
    interventionsItem: {
        height: '100%',
        width: '49%',
        overflow: 'auto',
        padding: 1,
    },
    noMixMessage: { color: '#1F2B3D99' },
    createMixButton: { textTransform: 'none' },
};

export const InterventionsMix: FC<Props> = ({
    scenarioId,
    selectedOrgUnits,
}) => {
    const { formatMessage } = useSafeIntl();
    const [selectedInterventions, setSelectedInterventions] = useState<{
        [categoryId: number]: number[] | [];
    }>({});
    const [mixName, setMixName] = useState<string>('');
    const [isButtonDisabled, setIsButtonDisabled] = useState<boolean>(false);

    const [selectedDistricts, setSelectedDistricts] = useState<OrgUnit[]>([]);
    const [createMix, setCreateMix] = useState<boolean>(false);

    useEffect(() => {
        setSelectedDistricts(selectedOrgUnits);
    }, [selectedOrgUnits]);

    const removeDistrict = useCallback(id => {
        setSelectedDistricts(prev =>
            prev.filter(district => district.id !== id),
        );
    }, []);

    const clearAllSelectedDistricts = useCallback(
        () => setSelectedDistricts([]),
        [],
    );

    return (
        <Box sx={styles.mainMixBox}>
            <Card elevation={2} sx={styles.card}>
                <CardHeader
                    title={
                        <InterventionMixSummary
                            scenarioId={scenarioId}
                            selectedOrgUnits={selectedDistricts}
                            selectedInterventions={selectedInterventions}
                            isButtonDisabled={isButtonDisabled}
                            setIsButtonDisabled={setIsButtonDisabled}
                            mixName={mixName}
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
                                    scenarioId={scenarioId}
                                    selectedOrgUnits={selectedOrgUnits}
                                    selectedInterventions={
                                        selectedInterventions
                                    }
                                    setIsButtonDisabled={setIsButtonDisabled}
                                    setSelectedInterventions={
                                        setSelectedInterventions
                                    }
                                    setCreateMix={setCreateMix}
                                    mixName={mixName}
                                    setMixName={setMixName}
                                />
                            ) : (
                                <Grid container spacing={2}>
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
                                                MESSAGES.noMixCreated,
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
                                                onClick={() =>
                                                    setCreateMix(true)
                                                }
                                            >
                                                {formatMessage(
                                                    MESSAGES.createNewMix,
                                                )}
                                            </Button>
                                        </Box>
                                    </Grid>
                                </Grid>
                            )}
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
        </Box>
    );
};
