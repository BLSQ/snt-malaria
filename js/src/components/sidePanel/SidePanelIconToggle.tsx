import React, { ComponentType, FC } from 'react';
import LogoutIcon from '@mui/icons-material/Logout';
import { Box, SvgIconProps, Tooltip } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../domains/messages';
import { IconBoxed } from '../IconBoxed';
import { useSidePanelContext } from './SidePanelContext';

const styles = {
    wrapper: {
        position: 'relative',
        display: 'inline-flex',
        cursor: 'pointer',
        '& > :first-of-type': { transition: 'opacity 0.15s ease' },
        '&:hover > :first-of-type': { opacity: 0 },
        '&:hover .hoverIcon': { opacity: 1 },
    },
    hoverIcon: {
        position: 'absolute',
        inset: 0,
        margin: 'auto',
        opacity: 0,
        transition: 'opacity 0.15s ease, transform 0.2s ease',
    },
} satisfies SxStyles;

type Props = {
    icon: ComponentType<SvgIconProps>;
};

export const SidePanelIconToggle: FC<Props> = ({ icon }) => {
    const { isOpen, toggle, locked } = useSidePanelContext();
    const { formatMessage } = useSafeIntl();

    if (locked) {
        return <IconBoxed Icon={icon} />;
    }

    return (
        <Tooltip
            title={formatMessage(
                isOpen ? MESSAGES.hideSidePanel : MESSAGES.showSidePanel,
            )}
        >
            <Box onClick={toggle} sx={styles.wrapper}>
                <IconBoxed Icon={icon} />
                <LogoutIcon
                    className="hoverIcon"
                    color="primary"
                    sx={{
                        ...styles.hoverIcon,
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                />
            </Box>
        </Tooltip>
    );
};
