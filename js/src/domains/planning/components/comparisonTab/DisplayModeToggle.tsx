import React, { FC } from 'react';
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

    return (
        <ToggleButtonGroup
            value={displayMode}
            size="small"
            exclusive
            onChange={(_, value) => value && onChange(value)}
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
