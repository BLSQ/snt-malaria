import React, { FC } from 'react';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import { Button, Stack } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../messages';
import { DisplayModeToggle } from './DisplayModeToggle';
import { DisplayMode } from './types';

const styles = {
    addSlot: {
        whiteSpace: 'nowrap',
    },
} satisfies SxStyles;

type Props = {
    canAddSlot: boolean;
    onAddSlot: () => void;
    displayMode: DisplayMode;
    onDisplayModeChange: (displayMode: DisplayMode) => void;
};

export const ComparisonHeaderControls: FC<Props> = ({
    canAddSlot,
    onAddSlot,
    displayMode,
    onDisplayModeChange,
}) => {
    const { formatMessage } = useSafeIntl();

    return (
        <Stack direction="row" spacing={2} alignItems="center">
            {canAddSlot && (
                <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    startIcon={<AddOutlinedIcon fontSize="small" />}
                    onClick={onAddSlot}
                    sx={styles.addSlot}
                >
                    {formatMessage(MESSAGES.comparisonAddScenario)}
                </Button>
            )}
            <DisplayModeToggle
                displayMode={displayMode}
                onChange={onDisplayModeChange}
            />
        </Stack>
    );
};
