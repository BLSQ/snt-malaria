import React, { FC, ReactNode } from 'react';
import AdsClickIcon from '@mui/icons-material/AdsClick';
import CloseIcon from '@mui/icons-material/Close';
import { Box, IconButton, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { overrideColors } from '../../constants/overrideColors';
import { MESSAGES } from '../../domains/messages';
import { Side, Size } from './computePlacement';

const EXPANDED_WIDTH = 340;
const EXPANDABLE_ATTRIBUTE = 'data-hover-card-expandable';

const styles = {
    card: {
        width: 272,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: 'background.paper',
        border: theme => `1px solid ${theme.palette.divider}`,
        borderRadius: theme => `${theme.shape.borderRadius * 2}px`,
        boxShadow:
            '0 8px 24px rgba(31,43,61,0.14), 0 1px 3px rgba(31,43,61,0.08)',
        transition: 'width 180ms ease',
        '& .MuiTypography-root': {
            lineHeight: 1.3,
        },
    },
    expandedCard: {
        width: EXPANDED_WIDTH,
        borderColor: 'primary.main',
        boxShadow: `0 0 0 3px ${overrideColors.focusGlow}, 0 12px 32px rgba(31,43,61,0.2), 0 1px 3px rgba(31,43,61,0.08)`,
    },
    header: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
        padding: '12px 14px 10px',
    },
    titles: {
        flex: '1 1 auto',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
    },
    title: {
        fontSize: theme => theme.typography.pxToRem(15),
        fontWeight: 'fontWeightMedium',
    },
    headerExtra: {
        flex: '0 1 auto',
        minWidth: 0,
    },
    body: {
        padding: '0 14px 12px',
    },
    actionArea: {
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'grey.100',
    },
    upwardsActionArea: {
        order: 1,
        borderTop: theme => `1px solid ${theme.palette.divider}`,
    },
    downwardsActionArea: {
        order: -1,
        borderBottom: theme => `1px solid ${theme.palette.divider}`,
    },
    actionHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        height: 36,
        boxSizing: 'border-box',
        padding: '0 14px',
        color: 'text.secondary',
    },
    leftwardsHint: {
        flexDirection: 'row-reverse',
    },
    expandedActionHeader: {
        paddingRight: 1,
    },
    hintIcon: {
        fontSize: 16,
    },
    actionHeaderText: {
        flex: '1 1 auto',
        minWidth: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    closeButton: {
        padding: '3px',
        color: 'text.secondary',
    },
    closeIcon: {
        fontSize: 18,
    },
    expandable: {
        display: 'grid',
        gridTemplateRows: '0fr',
        transition: 'grid-template-rows 220ms cubic-bezier(0.4, 0, 0.2, 1)',
    },
    expandedExpandable: {
        gridTemplateRows: '1fr',
    },
    upwardsExpandable: {
        order: -1,
    },
    expandableContent: {
        minHeight: 0,
        overflow: 'hidden',
    },
} satisfies SxStyles;

type HoverCardExpansionState = {
    /** The card's side, so the most used row can sit next to the pointer. */
    side: Side;
    isExpanded: boolean;
    close: () => void;
};

export type HoverCardExpansion = {
    title: string;
    /** Also rendered while collapsed, to measure the size the card grows to. */
    content: (state: HoverCardExpansionState) => ReactNode;
};

/** The size the card grows to when its expansion opens. */
export const getHoverCardPlannedSize = (element: HTMLElement): Size => {
    const size = { width: element.offsetWidth, height: element.offsetHeight };
    const collapsed = element.querySelector(
        `[${EXPANDABLE_ATTRIBUTE}="collapsed"]`,
    );
    if (!collapsed) return size;
    return {
        width: Math.max(size.width, EXPANDED_WIDTH),
        height: size.height + collapsed.scrollHeight,
    };
};

type Props = {
    title: string;
    subtitle?: string;
    headerExtra?: ReactNode;
    /** Short "Click to …" line, only for surfaces where a click does something. */
    hint?: string;
    expansion?: HoverCardExpansion;
    isExpanded: boolean;
    onClose: () => void;
    /** Side the card opens towards from the pointer; the action area faces the pointer. */
    side: Side;
    children?: ReactNode;
};

export const HoverCard: FC<Props> = ({
    title,
    subtitle,
    headerExtra,
    hint,
    expansion,
    isExpanded,
    onClose,
    side,
    children,
}) => {
    const { formatMessage } = useSafeIntl();
    const showsExpansion = isExpanded && expansion;
    return (
        <Box sx={[styles.card, Boolean(showsExpansion) && styles.expandedCard]}>
            {(hint || expansion) && (
                <Box
                    sx={[
                        styles.actionArea,
                        side.up
                            ? styles.upwardsActionArea
                            : styles.downwardsActionArea,
                    ]}
                >
                    {showsExpansion ? (
                        <Box
                            sx={[
                                styles.actionHeader,
                                styles.expandedActionHeader,
                            ]}
                        >
                            <Typography
                                variant="caption"
                                sx={styles.actionHeaderText}
                            >
                                {expansion.title}
                            </Typography>
                            <IconButton
                                sx={styles.closeButton}
                                onClick={onClose}
                                title={formatMessage(MESSAGES.tooltipClose)}
                                aria-label={formatMessage(
                                    MESSAGES.tooltipClose,
                                )}
                            >
                                <CloseIcon sx={styles.closeIcon} />
                            </IconButton>
                        </Box>
                    ) : (
                        <Box
                            sx={[
                                styles.actionHeader,
                                side.left && styles.leftwardsHint,
                            ]}
                        >
                            <AdsClickIcon sx={styles.hintIcon} />
                            <Typography
                                variant="caption"
                                sx={styles.actionHeaderText}
                            >
                                {hint}
                            </Typography>
                        </Box>
                    )}
                    {expansion && (
                        <Box
                            sx={[
                                styles.expandable,
                                isExpanded && styles.expandedExpandable,
                                side.up && styles.upwardsExpandable,
                            ]}
                        >
                            <Box
                                sx={styles.expandableContent}
                                {...{
                                    [EXPANDABLE_ATTRIBUTE]: isExpanded
                                        ? 'expanded'
                                        : 'collapsed',
                                }}
                            >
                                {expansion.content({
                                    side,
                                    isExpanded,
                                    close: onClose,
                                })}
                            </Box>
                        </Box>
                    )}
                </Box>
            )}
            <Box sx={styles.header}>
                <Box sx={styles.titles}>
                    <Typography variant="body2" sx={styles.title}>
                        {title}
                    </Typography>
                    {subtitle && (
                        <Typography variant="caption" color="text.secondary">
                            {subtitle}
                        </Typography>
                    )}
                </Box>
                {headerExtra && (
                    <Box sx={styles.headerExtra}>{headerExtra}</Box>
                )}
            </Box>
            {children && <Box sx={styles.body}>{children}</Box>}
        </Box>
    );
};
