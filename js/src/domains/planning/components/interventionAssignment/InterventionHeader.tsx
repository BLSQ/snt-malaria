import React, { FC, useCallback, useMemo, useState } from 'react';
import SettingsInputComponentOutlinedIcon from '@mui/icons-material/SettingsInputComponentOutlined';
import { Grid, Stack, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { noOp } from 'Iaso/utils';
import { IconBoxed } from '../../../../components/IconBoxed';
import { MESSAGES } from '../../../messages';
import {
    getConflictingAssignments,
    InterventionAssignmentConflict,
} from '../../libs/intervention-assignment-utils';
import {
    Intervention,
    InterventionCategory,
    InterventionPlan,
} from '../../types/interventions';
import { ConflictManagementModal } from '../conflictManagement/ConflictManagementModal';

type Props = {
    scenarioId: number | undefined;
    selectedOrgUnits: OrgUnit[];
    selectedInterventions: { [categoryId: number]: Intervention };
    setSelectedInterventions: React.Dispatch<
        React.SetStateAction<{ [categoryId: number]: Intervention }>
    >;
    interventionPlans: InterventionPlan[];
    interventionCategories: InterventionCategory[];
    onCreateInterventionAssignments: (args: {
        orgunit_interventions: { [orgUnitId: number]: number[] };
        scenario_id: number | undefined;
    }) => Promise<unknown>;
    disabled?: boolean;
};

export const InterventionHeader: FC<Props> = ({
    scenarioId,
    selectedOrgUnits,
    selectedInterventions,
    interventionPlans,
    setSelectedInterventions,
    interventionCategories,
    onCreateInterventionAssignments,
    disabled = false,
}) => {
    const [conflicts, setConflicts] = useState<
        InterventionAssignmentConflict[]
    >([]);
    const { formatMessage } = useSafeIntl();

    const selectedInterventionValues = useMemo(
        () => Object.values(selectedInterventions).filter(Boolean),
        [selectedInterventions],
    );

    const canApplyInterventions = useMemo(() => {
        return (
            selectedInterventionValues.length > 0 &&
            selectedOrgUnits.length > 0 &&
            scenarioId !== null &&
            !disabled
        );
    }, [
        selectedInterventionValues.length,
        selectedOrgUnits.length,
        scenarioId,
        disabled,
    ]);

    const getOrgUnitAssignments = useCallback(() => {
        return selectedOrgUnits.reduce(
            (acc, orgUnit) => {
                acc[orgUnit.id] = selectedInterventionValues;

                return acc;
            },
            {} as { [orgUnitId: number]: Intervention[] },
        );
    }, [selectedOrgUnits, selectedInterventionValues]);

    const getExistingOrgUnitAssignments = useCallback(() => {
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
    }, [interventionPlans]);

    const getExistingAssignments = useCallback(
        (orgUnitId: number) => {
            return interventionPlans
                .filter(plan => plan.org_units.some(ou => ou.id === orgUnitId))
                .map(plan => plan.intervention);
        },
        [interventionPlans],
    );

    // Returns org unit assignments containing new and existing assignments
    const getAllOrgUnitAssignments = useCallback(() => {
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
                    ...new Set<number>([
                        ...acc[orgUnit.id],
                        ...existingAssignmentIds,
                    ]),
                ];

                return acc;
            },
            {} as { [orgUnitId: number]: number[] },
        );
    }, [selectedOrgUnits, selectedInterventionValues, getExistingAssignments]);

    const createAssignments = useCallback(
        async (
            orgUnitInterventions: {
                [orgUnitId: number]: number[];
            },
            closeDialog: () => void,
        ) => {
            await onCreateInterventionAssignments({
                orgunit_interventions: orgUnitInterventions,
                scenario_id: scenarioId,
            });

            closeDialog();
            setSelectedInterventions({});
        },
        [onCreateInterventionAssignments, setSelectedInterventions, scenarioId],
    );

    const checkForConflict = useCallback(() => {
        if (!canApplyInterventions) {
            return false;
        }
        const ouAssignments = getOrgUnitAssignments();
        const ouExistingAssignments = getExistingOrgUnitAssignments();
        const conflictingAssignments = getConflictingAssignments(
            selectedOrgUnits,
            ouAssignments,
            ouExistingAssignments,
        );

        setConflicts(conflictingAssignments);

        if (
            conflictingAssignments.length <= 0 ||
            !conflictingAssignments.some(c => c.isConflicting)
        ) {
            const ouAssignments = getAllOrgUnitAssignments();
            createAssignments(ouAssignments, noOp);
            return false;
        }

        return true;
    }, [
        getAllOrgUnitAssignments,
        getOrgUnitAssignments,
        canApplyInterventions,
        createAssignments,
        selectedOrgUnits,
        getExistingOrgUnitAssignments,
    ]);

    return (
        <Grid
            container
            direction="row"
            alignItems="center"
            justifyContent="space-between"
        >
            <Stack direction="row" spacing={1} alignItems="center">
                <IconBoxed Icon={SettingsInputComponentOutlinedIcon} />

                <Typography variant="h6" gutterBottom color="#1F2B3D">
                    {formatMessage(MESSAGES.interventionTitle)}
                </Typography>
            </Stack>
            <ConflictManagementModal
                interventionCategories={interventionCategories}
                iconProps={{
                    disabled: !canApplyInterventions,
                    beforeOnClick: checkForConflict,
                }}
                conflicts={conflicts}
                onApply={createAssignments}
            />
        </Grid>
    );
};
