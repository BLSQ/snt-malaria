import React, { FunctionComponent, useMemo } from 'react';
import { MenuItem, Select, Theme, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../domains/messages';
import { sortByStringProp } from '../domains/planning/libs/list-utils';
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

    const sortedInterventions = useMemo(
        () => (interventions ? sortByStringProp(interventions, 'name') : []),
        [interventions],
    );

    return sortedInterventions && sortedInterventions.length > 0 ? (
        <Select
            value={selectedInterventionId}
            onChange={handleSelectedPlanChange}
            displayEmpty
            sx={styles.select}
        >
            {sortedInterventions.length > 1 && (
                <MenuItem value={0}>
                    <Typography variant="body2">
                        {formatMessage(MESSAGES.allInterventions)}
                    </Typography>
                </MenuItem>
            )}
            {sortedInterventions &&
                sortedInterventions.map(intervention => {
                    return (
                        <MenuItem key={intervention.id} value={intervention.id}>
                            <Typography variant="body2">
                                {intervention.short_name}
                            </Typography>
                        </MenuItem>
                    );
                })}
        </Select>
    ) : null;
};
