import React, { FC, useMemo, useState } from 'react';
import SettingsInputComponentOutlinedIcon from '@mui/icons-material/SettingsInputComponentOutlined';
import { Box, Grid, Stack, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { MESSAGES } from '../../../messages';
import { UseCreateInterventionAssignment } from '../../hooks/UseCreateInterventionAssignment';
import {
    getConflictingAssignments,
    InterventionAssignmentConflict,
} from '../../libs/intervention-assignment-utils';
import { Intervention, InterventionPlan } from '../../types/interventions';
import { ConflictManagementModal } from '../conflictManagement/ConflictManagementModal';
import { containerBoxStyles } from '../styles';

type Props = {
    scenarioId: number | undefined;
    selectedOrgUnits: OrgUnit[];
    selectedInterventions: { [categoryId: number]: Intervention };
    setSelectedInterventions: React.Dispatch<
        React.SetStateAction<{ [categoryId: number]: Intervention }>
    >;
    interventionPlans: InterventionPlan[];
};

export const InterventionHeader: FC<Props> = ({
    scenarioId,
    selectedOrgUnits,
    selectedInterventions,
    interventionPlans,
    setSelectedInterventions,
}) => {
    const [conflicts, setConflicts] = useState<
        InterventionAssignmentConflict[]
    >([]);
    const { formatMessage } = useSafeIntl();
    const { mutateAsync: createInterventionAssignment } =
        UseCreateInterventionAssignment();

    const selectedInterventionValues = useMemo(
        () => Object.values(selectedInterventions).filter(Boolean),
        [selectedInterventions],
    );

    const canApplyInterventions = useMemo(() => {
        return (
            selectedInterventionValues.length > 0 &&
            selectedOrgUnits.length > 0 &&
            scenarioId !== null
        );
    }, [
        selectedInterventionValues.length,
        selectedOrgUnits.length,
        scenarioId,
    ]);
    const formReset = () => {
        setSelectedInterventions({});
    };

    const handleAssignmentCreation = async () => {
        if (canApplyInterventions) {
            await createInterventionAssignment({
                intervention_ids: selectedInterventionValues,
                org_unit_ids: selectedOrgUnits.map(orgUnit => orgUnit.id),
                scenario_id: scenarioId,
            });
        }
        formReset();
    };

    const checkForConflict = () => {
        const conflictingAssignments = getConflictingAssignments(
            selectedOrgUnits,
            selectedInterventions,
            interventionPlans,
        );

        setConflicts(conflictingAssignments);

        if (conflictingAssignments.length <= 0) {
            handleAssignmentCreation();
            return false;
        }

        return true;
    };

    const applyConflictResolution = (_conflictResolution: {
        [orgUnitId: number]: number[];
    }) => {
        // TODO Set the request properly.
        // TODO Need to only apply conflict resolution based on  category
        // TODO Maybe this needs to change when generating the conflict model.

        handleAssignmentCreation();
    };

    return (
        <Grid
            container
            direction="row"
            alignItems="center"
            justifyContent="space-between"
        >
            <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={containerBoxStyles}>
                    <SettingsInputComponentOutlinedIcon
                        height="auto"
                        color="primary"
                    />
                </Box>
                <Typography variant="h6" gutterBottom color="#1F2B3D">
                    {formatMessage(MESSAGES.interventionTitle)}
                </Typography>
            </Stack>
            <ConflictManagementModal
                iconProps={{
                    disabled: !canApplyInterventions,
                    beforeOnClick: checkForConflict,
                }}
                conflicts={conflicts}
                onApply={applyConflictResolution}
            />
        </Grid>
    );
};
