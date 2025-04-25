import React, { FC, useMemo } from 'react';
import TuneIcon from '@mui/icons-material/Tune';
import { Box, Button, Grid, Stack, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { useQueryClient } from 'react-query';
import { UseCreateInterventionAssignment } from '../../hooks/UseCreateInterventionAssignment';
import { MESSAGES } from '../../messages';
import { containerBoxStyles } from '../styles';

type Props = {
    scenarioId: number | undefined;
    selectedOrgUnits: any;
    isButtonDisabled: boolean;
    selectedInterventions: { [categoryId: number]: number[] | [] };
    setIsButtonDisabled: (bool: boolean) => void;
};
export const InterventionMixSummary: FC<Props> = ({
    scenarioId,
    selectedOrgUnits,
    isButtonDisabled,
    selectedInterventions,
    setIsButtonDisabled,
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
            selectedInterventionValues.length > 0 &&
            selectedOrgUnits.length > 0 &&
            scenarioId
        );
    }, [
        scenarioId,
        selectedInterventionValues.length,
        selectedOrgUnits.length,
    ]);
    const handleAssignmentCreation = async () => {
        if (canApplyInterventions) {
            setIsButtonDisabled(true);

            await createInterventionAssignment({
                intervention_ids: selectedInterventionValues,
                org_unit_ids: selectedOrgUnits.map(orgUnit => orgUnit.id),
                scenario_id: scenarioId,
            });

            queryClient.invalidateQueries(['interventionPlans']);
        }
    };
    return (
        <Grid
            container
            direction="row"
            alignItems="center"
            justifyContent="space-between"
        >
            <Grid item sx={{ flexGrow: 1 }}>
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
                sx={{ flexGrow: 1 }}
            >
                <Button
                    onClick={() => handleAssignmentCreation()}
                    variant="contained"
                    color="primary"
                    sx={{
                        fontSize: '0.875rem',
                        textTransform: 'none',
                    }}
                    disabled={!canApplyInterventions || isButtonDisabled}
                >
                    {formatMessage(MESSAGES.applyInterventionMix)}
                </Button>
            </Grid>
        </Grid>
    );
};
