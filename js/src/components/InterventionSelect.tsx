import React, { FunctionComponent } from 'react';
import { MenuItem, Select, Theme, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../domains/messages';
import { Intervention } from '../domains/planning/types/interventions';

const styles: SxStyles = {
    select: (theme: Theme) => ({
        minWidth: 120,
        '& .MuiSelect-select': { padding: '8px 12px' },
        backgroundColor: 'white',
        marginRight: 1,
        borderRadius: theme.spacing(0.5),
        height: '36px',
        '& .MuiOutlinedInput-notchedOutline': {
            border: 0,
        },
    }),
};

type Props = {
    interventions: Intervention[] | undefined;
    selectedInterventionId: number | null;
    onInterventionSelect: (interventionId: number) => unknown;
};
export const InterventionSelect: FunctionComponent<Props> = ({
    interventions,
    selectedInterventionId,
    onInterventionSelect,
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
            sx={styles.select}
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
