import React, { FC } from 'react';
import CheckIcon from '@mui/icons-material/Check';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CloseIcon from '@mui/icons-material/Close';
import DoNotDisturbOnOutlinedIcon from '@mui/icons-material/DoNotDisturbOnOutlined';
import RemoveIcon from '@mui/icons-material/Remove';
import { Box, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { hoverCardSpacing } from '../../../../components/hoverCard/hoverCardSpacing';
import { overrideColors } from '../../../../constants/overrideColors';
import { MESSAGES } from '../../../messages';

const styles = {
    root: {
        display: 'flex',
        flexDirection: 'column',
        gap: hoverCardSpacing.section,
    },
    status: {
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        padding: '8px 10px',
        borderRadius: theme => `${theme.shape.borderRadius * 2}px`,
        backgroundColor: 'grey.100',
        color: 'text.secondary',
    },
    includedStatus: {
        backgroundColor: 'primary.light',
        color: 'primary.main',
    },
    statusIcon: {
        fontSize: 18,
    },
    statusLabel: {
        fontWeight: 'fontWeightMedium',
    },
    rows: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
    },
    row: {
        display: 'flex',
        alignItems: 'center',
        gap: 1,
    },
    rowLabel: {
        flex: '1 1 auto',
        minWidth: 0,
        color: 'text.secondary',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    rowValue: {
        flex: '0 0 auto',
        color: 'text.primary',
        fontVariantNumeric: 'tabular-nums',
    },
    rowCriterion: {
        flex: '0 0 auto',
        color: 'text.secondary',
        fontVariantNumeric: 'tabular-nums',
    },
    rowIcon: {
        flex: '0 0 auto',
        fontSize: 16,
    },
    metIcon: {
        color: 'success.main',
    },
    unmetIcon: {
        color: 'error.main',
    },
    unsetIcon: {
        color: 'text.secondary',
    },
    overriddenText: {
        color: overrideColors.notApplicableText,
        textDecoration: 'line-through',
    },
    overriddenIcon: {
        color: overrideColors.notApplicableText,
    },
} satisfies SxStyles;

export type CriterionCheck = {
    key: string;
    label: string;
    value?: string;
    /** The criterion as text, e.g. "≥ 10"; undefined when its value is not set. */
    criterion?: string;
    /** Undefined when the criterion has no value set yet. */
    meets?: boolean;
};

type Props = {
    isIncluded: boolean;
    criteria: CriterionCheck[];
    manualChange?: 'added' | 'removed';
};

const getCheckIcon = (meets?: boolean) => {
    if (meets === undefined)
        return { Icon: RemoveIcon, style: styles.unsetIcon };
    return meets
        ? { Icon: CheckIcon, style: styles.metIcon }
        : { Icon: CloseIcon, style: styles.unmetIcon };
};

const CheckIndicator: FC<{ meets?: boolean; isOverridden?: boolean }> = ({
    meets,
    isOverridden,
}) => {
    const { Icon, style } = getCheckIcon(meets);
    return (
        <Icon
            sx={[
                styles.rowIcon,
                style,
                Boolean(isOverridden) && styles.overriddenIcon,
            ]}
        />
    );
};

export const RuleSelectionTooltipBody: FC<Props> = ({
    isIncluded,
    criteria,
    manualChange,
}) => {
    const { formatMessage } = useSafeIntl();
    const StatusIcon = isIncluded
        ? CheckCircleOutlinedIcon
        : DoNotDisturbOnOutlinedIcon;
    const isOverridden = Boolean(manualChange);
    const overriddenText = isOverridden && styles.overriddenText;
    return (
        <Box sx={styles.root}>
            <Box sx={[styles.status, isIncluded && styles.includedStatus]}>
                <StatusIcon sx={styles.statusIcon} />
                <Typography variant="body2" sx={styles.statusLabel}>
                    {formatMessage(
                        isIncluded
                            ? MESSAGES.tooltipIncludedInRule
                            : MESSAGES.tooltipNotIncludedInRule,
                    )}
                </Typography>
            </Box>
            {(criteria.length > 0 || manualChange) && (
                <Box sx={styles.rows}>
                    {criteria.map(criterion => (
                        <Box key={criterion.key} sx={styles.row}>
                            <Typography
                                variant="caption"
                                sx={[styles.rowLabel, overriddenText]}
                            >
                                {criterion.label}
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={[styles.rowValue, overriddenText]}
                            >
                                {criterion.value ??
                                    formatMessage(MESSAGES.tooltipNoData)}
                            </Typography>
                            {criterion.criterion && (
                                <Typography
                                    variant="caption"
                                    sx={[styles.rowCriterion, overriddenText]}
                                >
                                    {criterion.criterion}
                                </Typography>
                            )}
                            <CheckIndicator
                                meets={criterion.meets}
                                isOverridden={isOverridden}
                            />
                        </Box>
                    ))}
                    {manualChange && (
                        <Box sx={styles.row}>
                            <Typography variant="caption" sx={styles.rowLabel}>
                                {formatMessage(MESSAGES.manualSelection)}
                            </Typography>
                            <Typography variant="body2" sx={styles.rowValue}>
                                {formatMessage(
                                    manualChange === 'added'
                                        ? MESSAGES.tooltipManuallyAdded
                                        : MESSAGES.tooltipManuallyRemoved,
                                )}
                            </Typography>
                            <CheckIndicator meets={manualChange === 'added'} />
                        </Box>
                    )}
                </Box>
            )}
        </Box>
    );
};
