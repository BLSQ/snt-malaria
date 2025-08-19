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

    const getOrgUnitAssignments = () => {
        return selectedOrgUnits.reduce(
            (acc, orgUnit) => {
                acc[orgUnit.id] = selectedInterventionValues;

                return acc;
            },
            {} as { [orgUnitId: number]: Intervention[] },
        );
    };

    const getExistingOrgUnitAssignments = () => {
        return interventionPlans.reduce(
            (acc, ip) => {
                ip.org_units.forEach(ou => {
                    if (!acc[ou.id]) {
                        acc[ou.id] = [];
                    }
                    acc[ou.id].push(ip.intervention);
                });
                return acc;
            },
            {} as { [orgUnitId: number]: Intervention[] },
        );
    };

    // Returns org unit assignments containing new and existing assignments
    const getAllOrgUnitAssignments = () => {
        return selectedOrgUnits.reduce(
            (acc, orgUnit) => {
                acc[orgUnit.id] = selectedInterventionValues.map(
                    intervention => intervention.id,
                );

                // We also need existing assignment here, as we do a full replacement
                const existingAssignmentIds = getExistingAssignments(
                    orgUnit.id,
                ).map(intervention => intervention.id);

                acc[orgUnit.id] = [
                    ...acc[orgUnit.id],
                    ...existingAssignmentIds,
                ];
                return acc;
            },
            {} as { [orgUnitId: number]: number[] },
        );
    };

    const getExistingAssignments = (orgUnitId: number) => {
        return interventionPlans
            .filter(plan => plan.org_units.some(ou => ou.id === orgUnitId))
            .map(plan => plan.intervention);
    };

    const createAssignments = async (orgUnitInterventions: {
        [orgUnitId: number]: number[];
    }) => {
        await createInterventionAssignment({
            orgunit_interventions: orgUnitInterventions,
            scenario_id: scenarioId,
        });

        formReset();
    };

    const checkForConflict = () => {
        if (!canApplyInterventions) {
            return false;
        }
        const ouAssignments = getOrgUnitAssignments();
        const ouExistingAssignments = getExistingOrgUnitAssignments();
        const conflictingAssignments = getConflictingAssignments(
            ouAssignments,
            ouExistingAssignments,
        );

        setConflicts(conflictingAssignments);

        if (
            conflictingAssignments.length <= 0 ||
            !conflictingAssignments.some(c => c.isConflicting)
        ) {
            const ouAssignments = getAllOrgUnitAssignments();
            createAssignments(ouAssignments);
            return false;
        }

        return true;
    };

    const applyConflictResolution = async (conflictResolution: {
        [orgUnitId: number]: number[];
    }) => {
        // TODO Make sure it also contains non conflicting assignments
        // TODO Should we add all existing assignments to the conflict resolution?
        await createAssignments(conflictResolution);
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
