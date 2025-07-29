import React, { FunctionComponent } from 'react';
import { MenuItem, Select, SxProps, Theme, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { MESSAGES } from '../../messages';
import { InterventionPlan } from '../../types/interventions';

type Props = {
    interventionPlans: InterventionPlan[] | undefined;
    selectedPlanId: number | null;
    onPlanSelect: (planId: number) => unknown;
    sx: SxProps<Theme>;
};
export const InterventionSelect: FunctionComponent<Props> = ({
    interventionPlans,
    selectedPlanId,
    onPlanSelect,
    sx,
}) => {
    const { formatMessage } = useSafeIntl();

    const handleSelectedPlanChange = event => {
        onPlanSelect(event.target.value ?? 0);
    };

    return interventionPlans ? (
        <Select
            value={selectedPlanId}
            onChange={handleSelectedPlanChange}
            displayEmpty
            sx={sx}
        >
            {interventionPlans.length > 1 && (
                <MenuItem value={0}>
                    <Typography variant="body2">
                        {formatMessage(MESSAGES.allInterventions)}
                    </Typography>
                </MenuItem>
            )}
            {interventionPlans &&
                interventionPlans.map(({ intervention }) => {
                    return (
                        <MenuItem key={intervention.id} value={intervention.id}>
                            <Typography variant="body2">
                                {intervention.name}
                            </Typography>
                        </MenuItem>
                    );
                })}
        </Select>
    ) : null;
};
