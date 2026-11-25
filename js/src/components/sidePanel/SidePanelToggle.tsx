import React, { FC, useCallback, useLayoutEffect, useRef } from 'react';
import Box from '@mui/material/Box/Box';
import ButtonBase from '@mui/material/ButtonBase/ButtonBase';
import { alpha } from '@mui/material/styles';
import useTheme from '@mui/material/styles/useTheme';
import Typography from '@mui/material/Typography/Typography';
import { SxStyles } from 'Iaso/types/general';
import { noMotion, SLIDE_MS } from './constants';
import { ShowSidePanelIcon } from './icons';
import { useSidePanelActions, useSidePanelContext } from './SidePanelContext';

const styles = {
    wrapper: {
        display: 'inline-flex',
        flexShrink: 0,
        overflow: 'hidden',
        ...noMotion,
    },
    inner: {
        display: 'flex',
        pr: 1.5,
    },
    button: {
        height: 42,
        maxWidth: 340,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        pl: 1.25,
        pr: 1.75,
        borderRadius: 1,
        border: '1px solid',
        whiteSpace: 'nowrap',
        color: 'text.primary',
        transition: 'background-color 150ms, border-color 150ms',
    },
    closedButton: {
        borderColor: 'divider',
        backgroundColor: 'background.paper',
    },
    openButton: {
        borderColor: 'primary.main',
        backgroundColor: theme => alpha(theme.palette.primary.main, 0.08),
    },
    icon: {
        fontSize: 20,
        color: 'primary.main',
        flexShrink: 0,
    },
    title: {
        fontWeight: 500,
    },
    hint: {
        color: 'text.secondary',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
} satisfies SxStyles;

type Props = {
    fallback?: boolean;
};

export const SidePanelToggle: FC<Props> = ({ fallback = false }) => {
    const { mode, phase, floating, label } = useSidePanelContext();
    const { registerToggle, openFloating, closeFloating, onEnterToggle } =
        useSidePanelActions();
    const { transitions } = useTheme();
    const buttonRef = useRef<HTMLButtonElement>(null);

    useLayoutEffect(() => {
        if (!buttonRef.current) {
            return undefined;
        }
        return registerToggle(buttonRef.current, fallback);
    }, [registerToggle, fallback]);

    const isShown = mode === 'undocked' && phase !== 'docking';
    const isOpen = floating !== 'closed';

    const handleClick = useCallback(() => {
        if (phase) {
            return;
        }
        if (floating === 'pinned') {
            closeFloating();
        } else if (floating === 'closed') {
            openFloating();
        }
    }, [phase, floating, openFloating, closeFloating]);

    return (
        <Box
            aria-hidden={!isShown}
            sx={[
                styles.wrapper,
                {
                    maxWidth: isShown ? 360 : 0,
                    opacity: isShown ? 1 : 0,
                    visibility: isShown ? 'visible' : 'hidden',
                    transition: `max-width ${SLIDE_MS}ms ${transitions.easing.easeInOut}, opacity 200ms ${isShown ? 140 : 0}ms, visibility ${SLIDE_MS}ms`,
                },
            ]}
        >
            <Box sx={styles.inner}>
                <ButtonBase
                    ref={buttonRef}
                    onClick={handleClick}
                    onMouseEnter={onEnterToggle}
                    aria-expanded={isOpen}
                    sx={[
                        styles.button,
                        isOpen ? styles.openButton : styles.closedButton,
                    ]}
                >
                    <ShowSidePanelIcon sx={styles.icon} />
                    <Typography variant="body2" sx={styles.title}>
                        {label?.title}
                    </Typography>
                    {label?.hint && (
                        <Typography variant="body2" sx={styles.hint}>
                            · {label.hint}
                        </Typography>
                    )}
                </ButtonBase>
            </Box>
        </Box>
    );
};
