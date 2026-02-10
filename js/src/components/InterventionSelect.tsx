import React, { FunctionComponent, useMemo } from 'react';
import { MenuItem, Select, Typography } from '@mui/material';
import { IntlMessage, useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../domains/messages';
import { sortByStringProp } from '../domains/planning/libs/list-utils';
import { Intervention } from '../domains/planning/types/interventions';

const styles: SxStyles = {
    select: {
        minWidth: 120,
        '& .MuiSelect-select': { padding: '8px 12px' },
        backgroundColor: 'white',
        borderRadius: 1,
        height: '36px',
        '& .MuiOutlinedInput-notchedOutline': {
            border: 0,
        },
    },
};

type Props = {
    interventions: Intervention[] | undefined;
    selectedInterventionId: number | undefined;
    showAllOption?: boolean;
    showNoneOption?: boolean;
    onInterventionSelect: (interventionId: number) => unknown;
    placeholder?: IntlMessage;
};
export const InterventionSelect: FunctionComponent<Props> = ({
    interventions,
    selectedInterventionId,
    showAllOption = true,
    showNoneOption = false,
    onInterventionSelect,
    placeholder,
}) => {
    const { formatMessage } = useSafeIntl();

    const handleSelectedPlanChange = event => {
        onInterventionSelect(event.target.value ?? 0);
    };

    const sortedInterventions = useMemo(
        () => (interventions ? sortByStringProp(interventions, 'name') : []),
        [interventions],
    );

    const selectStyles = useMemo(
        () =>
            selectedInterventionId
                ? styles.select
                : { ...styles.select, color: 'text.secondary' },
        [selectedInterventionId],
    );

    return sortedInterventions && sortedInterventions.length > 0 ? (
        <Select
            value={selectedInterventionId ?? ''}
            onChange={handleSelectedPlanChange}
            displayEmpty
            sx={selectStyles}
        >
            {placeholder && (
                <MenuItem value={''} sx={{ color: 'text.secondary' }}>
                    {formatMessage(placeholder)}
                </MenuItem>
            )}
            {showAllOption && sortedInterventions.length > 1 && (
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
            {showNoneOption && (
                <MenuItem value={-1}>
                    <Typography variant="body2">
                        {formatMessage(MESSAGES.none)}
                    </Typography>
                </MenuItem>
            )}
        </Select>
    ) : null;
};
