import React, { FC, useMemo } from 'react';
import { ArrowForward } from '@mui/icons-material';
import TuneIcon from '@mui/icons-material/Tune';
import { Box, Button, Grid, Stack, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';
import { useQueryClient } from 'react-query';
import { UseCreateInterventionAssignment } from '../../hooks/UseCreateInterventionAssignment';
import { MESSAGES } from '../../messages';
import { containerBoxStyles } from '../styles';

type Props = {
    scenarioId: number | undefined;
    selectedOrgUnits: OrgUnit[];
    selectedInterventions: { [categoryId: number]: number[] | [] };
    mixName: string;
    setCreateMix: (createMix: boolean) => void;
    selectedMix: number | null;
    setSelectedMix: (mix: number | null) => void;
    setMixName: (mixName: string) => void;
    setSelectedInterventions: (interventions: []) => void;
};

const styles: SxStyles = {
    itemGrid: { flexGrow: 1 },
    applyButton: {
        fontSize: '0.875rem',
        textTransform: 'none',
    },
};

export const InterventionMixSummary: FC<Props> = ({
    scenarioId,
    selectedOrgUnits,
    selectedInterventions,
    mixName,
    setCreateMix,
    selectedMix,
    setSelectedMix,
    setMixName,
    setSelectedInterventions,
}) => {
    const { formatMessage } = useSafeIntl();
    const { mutateAsync: createInterventionAssignment } =
        UseCreateInterventionAssignment();

    const queryClient = useQueryClient();

    const selectedInterventionValues = useMemo(
        () =>
            Object.values(selectedInterventions)
                .flat()
                .filter(value => value !== null),
        [selectedInterventions],
    );

    const canApplyInterventions = useMemo(() => {
        return (
            ((selectedInterventionValues.length > 0 && mixName !== '') ||
                selectedMix !== null) &&
            selectedOrgUnits.length > 0 &&
            scenarioId !== null
        );
    }, [
        selectedInterventionValues.length,
        mixName,
        selectedMix,
        selectedOrgUnits.length,
        scenarioId,
    ]);
    const formReset = () => {
        setCreateMix(false);
        setMixName('');
        setSelectedInterventions([]);
        setSelectedMix(null);
    };

    const handleAssignmentCreation = async () => {
        if (canApplyInterventions) {
            await createInterventionAssignment({
                mix_name: mixName,
                intervention_ids: selectedInterventionValues,
                org_unit_ids: selectedOrgUnits.map(orgUnit => orgUnit.id),
                scenario_id: scenarioId,
                selectedMix,
            });

            queryClient.invalidateQueries(['interventionPlans']);
        }
        formReset();
    };

    return (
        <Grid
            container
            direction="row"
            alignItems="center"
            justifyContent="space-between"
        >
            <Grid item sx={styles.itemGrid}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={containerBoxStyles}>
                        <TuneIcon height="auto" color="primary" />
                    </Box>
                    <Typography variant="h6" gutterBottom color="#1F2B3D">
                        {formatMessage(MESSAGES.interventionMixTitle)}
                    </Typography>
                </Stack>
            </Grid>
            <Grid
                item
                display="flex"
                justifyContent="flex-end"
                alignItems="flex-end"
                sx={styles.itemGrid}
            >
                <Button
                    onClick={() => handleAssignmentCreation()}
                    variant="contained"
                    color="primary"
                    endIcon={<ArrowForward />}
                    sx={styles.applyButton}
                    disabled={!canApplyInterventions}
                >
                    {formatMessage(MESSAGES.applyInterventionMix)}
                </Button>
            </Grid>
        </Grid>
    );
};
