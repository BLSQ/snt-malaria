import React, { FC, useCallback } from 'react';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { MESSAGES } from '../../../messages';
import { DisplayMode } from './types';

type Props = {
    displayMode: DisplayMode;
    onChange: (displayMode: DisplayMode) => void;
};

export const DisplayModeToggle: FC<Props> = ({ displayMode, onChange }) => {
    const { formatMessage } = useSafeIntl();

    const handleChange = useCallback(
        (_: React.MouseEvent<HTMLElement>, value: DisplayMode | null) => {
            if (value) onChange(value);
        },
        [onChange],
    );

    return (
        <ToggleButtonGroup
            value={displayMode}
            size="small"
            exclusive
            onChange={handleChange}
        >
            <ToggleButton value="sideBySide" key="sideBySide">
                {formatMessage(MESSAGES.comparisonSideBySide)}
            </ToggleButton>
            <ToggleButton value="overlay" key="overlay">
                {formatMessage(MESSAGES.comparisonOverlay)}
            </ToggleButton>
        </ToggleButtonGroup>
    );
};
