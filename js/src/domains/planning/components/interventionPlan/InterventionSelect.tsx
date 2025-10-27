import React, { FunctionComponent } from 'react';
import { MenuItem, Select, SxProps, Theme, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { MESSAGES } from '../../../messages';
import { Intervention } from '../../types/interventions';

type Props = {
    interventions: Intervention[] | undefined;
    selectedInterventionId: number | null;
    onInterventionSelect: (interventionId: number) => unknown;
    sx: SxProps<Theme>;
};
export const InterventionSelect: FunctionComponent<Props> = ({
    interventions,
    selectedInterventionId,
    onInterventionSelect,
    sx,
}) => {
    const { formatMessage } = useSafeIntl();

    const handleSelectedPlanChange = event => {
        onInterventionSelect(event.target.value ?? 0);
    };

    return interventions && interventions.length > 0 ? (
        <Select
            value={selectedInterventionId}
            onChange={handleSelectedPlanChange}
            displayEmpty
            sx={sx}
        >
            {interventions.length > 1 && (
                <MenuItem value={0}>
                    <Typography variant="body2">
                        {formatMessage(MESSAGES.allInterventions)}
                    </Typography>
                </MenuItem>
            )}
            {interventions &&
                interventions.map(intervention => {
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
