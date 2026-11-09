import React, { FC, useCallback } from 'react';
import IconButton from '@mui/material/IconButton/IconButton';
import { alpha } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip/Tooltip';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../domains/messages';
import { DockSidePanelIcon, UndockSidePanelIcon } from './icons';
import { useSidePanelContext } from './SidePanelContext';

const styles = {
    button: {
        width: 40,
        height: 40,
        borderRadius: 2,
        color: 'text.secondary',
        '&:hover': {
            backgroundColor: theme => alpha(theme.palette.primary.main, 0.08),
        },
    },
    icon: {
        fontSize: 20,
    },
} satisfies SxStyles;

export const SidePanelDockButton: FC = () => {
    const { mode, phase, canUndock, dock, undock } = useSidePanelContext();
    const { formatMessage } = useSafeIntl();
    const isFloating = mode === 'undocked' || phase === 'lifting';

    const handleClick = useCallback(() => {
        if (phase) {
            return;
        }
        if (isFloating) {
            dock();
        } else {
            undock();
        }
    }, [phase, isFloating, dock, undock]);

    if (!canUndock) {
        return null;
    }

    const tooltip = formatMessage(
        isFloating ? MESSAGES.dockSidePanel : MESSAGES.undockSidePanel,
    );
    const Icon = isFloating ? DockSidePanelIcon : UndockSidePanelIcon;

    return (
        <Tooltip title={tooltip}>
            <IconButton
                aria-label={tooltip}
                onClick={handleClick}
                sx={styles.button}
            >
                <Icon sx={styles.icon} />
            </IconButton>
        </Tooltip>
    );
};
