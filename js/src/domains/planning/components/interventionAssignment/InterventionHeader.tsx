import React, { FC, useMemo, useState } from 'react';
import SettingsInputComponentOutlinedIcon from '@mui/icons-material/SettingsInputComponentOutlined';
import { Box, Grid, Stack, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { useQueryClient } from 'react-query';
import { MESSAGES } from '../../../messages';
import { UseCreateInterventionAssignment } from '../../hooks/UseCreateInterventionAssignment';
import {
    getConflictingAssignments,
    InterventionAssignmentConflict,
} from '../../libs/intervention-assignment-utils';
import { InterventionPlan } from '../../types/interventions';
import { ConflictManagementModal } from '../conflictManagement/ConflictManagementModal';
import { containerBoxStyles } from '../styles';

type Props = {
    scenarioId: number | undefined;
    selectedOrgUnits: OrgUnit[];
    selectedInterventions: { [categoryId: number]: number };
    setSelectedInterventions: React.Dispatch<
        React.SetStateAction<{ [categoryId: number]: number }>
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

    const queryClient = useQueryClient();

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
            // TODO maybe we don't need this anymore
            queryClient.invalidateQueries(['interventionAssigments']);
            queryClient.refetchQueries(['interventionAssignments', scenarioId]);
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
        console.log('conflicts ', conflictingAssignments);

        if (conflictingAssignments.length <= 0) {
            handleAssignmentCreation();
            return false;
        }

        return true;
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
            />
        </Grid>
    );
};
