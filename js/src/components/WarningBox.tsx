import React, { FC, ReactNode, useCallback, useState } from 'react';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import Box from '@mui/material/Box/Box';
import ButtonBase from '@mui/material/ButtonBase/ButtonBase';
import Collapse from '@mui/material/Collapse/Collapse';
import type { Theme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography/Typography';
import { SxStyles } from 'Iaso/types/general';
import { useKeepInViewWhileAnimating } from '../hooks/useKeepInViewWhileAnimating';
import { WarningBoxRevealContext } from './WarningBoxRevealContext';

export type WarningSeverity = 'error' | 'warning' | 'neutral';

const severityIcons = {
    error: ErrorOutlineIcon,
    warning: WarningAmberOutlinedIcon,
    neutral: InfoOutlinedIcon,
};

const severityStyles = {
    error: {
        borderColor: 'error.light',
        header: {
            backgroundColor: (theme: Theme) =>
                alpha(theme.palette.error.main, 0.08),
        },
        icon: { color: 'error.dark' },
    },
    warning: {
        borderColor: 'warning.light',
        header: {
            backgroundColor: (theme: Theme) =>
                alpha(theme.palette.warning.main, 0.08),
        },
        icon: { color: 'warning.dark' },
    },
    neutral: {
        borderColor: 'divider',
        header: { backgroundColor: 'common.white' },
        icon: { color: 'text.secondary' },
    },
};

const styles = {
    root: {
        flexShrink: 0,
        border: 1,
        borderRadius: 2,
        overflow: 'hidden',
        backgroundColor: 'common.white',
    },
    header: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        px: 1.75,
        py: 1.5,
        textAlign: 'left',
    },
    heading: {
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
    },
    title: {
        typography: 'body2',
        fontWeight: 'medium',
    },
    subtitle: {
        color: 'text.secondary',
    },
    chevron: {
        color: 'text.secondary',
    },
    body: {
        p: 1.75,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
    },
    neutralBody: {
        borderTop: 1,
        borderColor: 'divider',
    },
    description: {
        color: 'text.secondary',
    },
    action: {
        alignSelf: 'flex-end',
    },
    details: {
        display: 'flex',
        flexDirection: 'column',
        gap: 0.75,
    },
} satisfies SxStyles;

type Props = {
    severity: WarningSeverity;
    title: string;
    subtitle?: string;
    leading?: ReactNode;
    description?: string;
    collapsible?: boolean;
    defaultExpanded?: boolean;
    action?: ReactNode;
    children?: ReactNode;
};

export const WarningBox: FC<Props> = ({
    severity,
    title,
    subtitle,
    leading,
    description,
    collapsible = true,
    defaultExpanded = false,
    action,
    children,
}) => {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const hasBody = Boolean(description || children || action);
    const isToggleable = collapsible && hasBody;
    const isExpanded = !collapsible || expanded;
    const Icon = severityIcons[severity];
    const severityStyle = severityStyles[severity];

    const { ref: rootRef, ...keepInViewWhileExpanding } =
        useKeepInViewWhileAnimating<HTMLDivElement>();

    const toggleExpanded = useCallback(() => setExpanded(prev => !prev), []);
    const revealWarningBox = useCallback(
        () =>
            rootRef.current?.scrollIntoView({
                block: 'nearest',
                behavior: 'smooth',
            }),
        [rootRef],
    );

    return (
        <Box
            ref={rootRef}
            sx={[styles.root, { borderColor: severityStyle.borderColor }]}
        >
            <Box
                component={isToggleable ? ButtonBase : 'div'}
                onClick={isToggleable ? toggleExpanded : undefined}
                aria-expanded={isToggleable ? isExpanded : undefined}
                sx={[styles.header, severityStyle.header]}
            >
                {leading ?? <Icon fontSize="small" sx={severityStyle.icon} />}
                <Box sx={styles.heading}>
                    <Typography component="span" sx={styles.title}>
                        {title}
                    </Typography>
                    {subtitle && (
                        <Typography variant="caption" sx={styles.subtitle}>
                            {subtitle}
                        </Typography>
                    )}
                </Box>
                {isToggleable &&
                    (isExpanded ? (
                        <ExpandLessIcon fontSize="small" sx={styles.chevron} />
                    ) : (
                        <ExpandMoreIcon fontSize="small" sx={styles.chevron} />
                    ))}
            </Box>
            {hasBody && (
                <Collapse in={isExpanded} {...keepInViewWhileExpanding}>
                    <WarningBoxRevealContext.Provider value={revealWarningBox}>
                        <Box
                            sx={[
                                styles.body,
                                severity === 'neutral' && styles.neutralBody,
                            ]}
                        >
                            {description && (
                                <Typography
                                    variant="body2"
                                    sx={styles.description}
                                >
                                    {description}
                                </Typography>
                            )}
                            {children && (
                                <Box sx={styles.details}>{children}</Box>
                            )}
                            {action && <Box sx={styles.action}>{action}</Box>}
                        </Box>
                    </WarningBoxRevealContext.Provider>
                </Collapse>
            )}
        </Box>
    );
};
