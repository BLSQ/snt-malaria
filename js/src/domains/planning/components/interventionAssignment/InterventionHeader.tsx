import React, { FC, useMemo } from 'react';
import { ArrowForward } from '@mui/icons-material';
import SettingsInputComponentOutlinedIcon from '@mui/icons-material/SettingsInputComponentOutlined';
import { Box, Button, Grid, Stack, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { useQueryClient } from 'react-query';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../messages';
import { UseCreateInterventionAssignment } from '../../hooks/UseCreateInterventionAssignment';
import { containerBoxStyles } from '../styles';
import { ConflictManagementModal } from '../conflictManagement/ConflictManagementModal';

type Props = {
    scenarioId: number | undefined;
    selectedOrgUnits: OrgUnit[];
    selectedInterventions: { [categoryId: number]: number };
    setSelectedInterventions: React.Dispatch<
        React.SetStateAction<{ [categoryId: number]: number }>
    >;
};

export const InterventionHeader: FC<Props> = ({
    scenarioId,
    selectedOrgUnits,
    selectedInterventions,
    setSelectedInterventions,
}) => {
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

            queryClient.invalidateQueries(['interventionAssigments']);
            queryClient.refetchQueries(['interventionAssignments', scenarioId]);
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
            <ConflictManagementModal iconProps={{}} />
        </Grid>
    );
};
