import React, { FC, ReactNode, useCallback, useState } from 'react';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { Box, ButtonBase, Collapse, Theme, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { SxStyles } from 'Iaso/types/general';

export type WarningSeverity = 'error' | 'warning' | 'info';

const severityIcons = {
    error: ErrorOutlineIcon,
    warning: WarningAmberOutlinedIcon,
    info: InfoOutlinedIcon,
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
    info: {
        borderColor: 'divider',
        header: { backgroundColor: 'background.default' },
        icon: { color: 'info.main' },
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
    title: {
        flex: 1,
        minWidth: 0,
        typography: 'body2',
        fontWeight: 'medium',
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
    description: {
        color: 'text.secondary',
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
    description?: string;
    collapsible?: boolean;
    defaultExpanded?: boolean;
    children?: ReactNode;
};

export const WarningBox: FC<Props> = ({
    severity,
    title,
    description,
    collapsible = true,
    defaultExpanded = false,
    children,
}) => {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const hasBody = Boolean(description || children);
    const isToggleable = collapsible && hasBody;
    const isExpanded = !collapsible || expanded;
    const Icon = severityIcons[severity];
    const severityStyle = severityStyles[severity];

    const toggleExpanded = useCallback(() => setExpanded(prev => !prev), []);

    return (
        <Box sx={[styles.root, { borderColor: severityStyle.borderColor }]}>
            <Box
                component={isToggleable ? ButtonBase : 'div'}
                onClick={isToggleable ? toggleExpanded : undefined}
                aria-expanded={isToggleable ? isExpanded : undefined}
                sx={[styles.header, severityStyle.header]}
            >
                <Icon fontSize="small" sx={severityStyle.icon} />
                <Typography component="span" sx={styles.title}>
                    {title}
                </Typography>
                {isToggleable &&
                    (isExpanded ? (
                        <ExpandLessIcon fontSize="small" sx={styles.chevron} />
                    ) : (
                        <ExpandMoreIcon fontSize="small" sx={styles.chevron} />
                    ))}
            </Box>
            {hasBody && (
                <Collapse in={isExpanded}>
                    <Box sx={styles.body}>
                        {description && (
                            <Typography variant="body2" sx={styles.description}>
                                {description}
                            </Typography>
                        )}
                        {children && <Box sx={styles.details}>{children}</Box>}
                    </Box>
                </Collapse>
            )}
        </Box>
    );
};
