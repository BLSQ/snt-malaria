import React, { FC } from 'react';
import { Box, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { ColorDot } from '../../../../components/ColorDot';
import { overrideColors } from '../../../../constants/overrideColors';
import { MESSAGES } from '../../../messages';
import { AssignmentRuleSource } from './buildAssignmentTable';

const styles = {
    root: {
        flex: '0 0 auto',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 3,
        py: 1,
        px: 1.5,
        borderTop: 1,
        borderTopColor: 'divider',
        backgroundColor: 'background.paper',
        color: 'text.secondary',
    },
    summary: { flex: '0 0 auto', whiteSpace: 'nowrap' },
    legend: {
        flex: '1 1 auto',
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flexWrap: 'wrap',
        gap: '4px 14px',
    },
    legendItem: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        whiteSpace: 'nowrap',
    },
    changedSwatch: {
        width: 22,
        height: 14,
        borderRadius: 999,
        backgroundColor: overrideColors.overriddenBackground,
    },
} satisfies SxStyles;

type Props = {
    assignedCount: number;
    totalCount: number;
    legendRules: AssignmentRuleSource[];
    isRuleView: boolean;
    showDeployedLegend: boolean;
    ruleDotSize: number;
};

export const AssignmentTableFooter: FC<Props> = ({
    assignedCount,
    totalCount,
    legendRules,
    isRuleView,
    showDeployedLegend,
    ruleDotSize,
}) => {
    const { formatMessage } = useSafeIntl();
    return (
        <Box sx={styles.root}>
            <Typography variant="caption" sx={styles.summary}>
                {formatMessage(
                    isRuleView
                        ? MESSAGES.assignmentTableCountRule
                        : MESSAGES.assignmentTableCountScenario,
                    { assigned: assignedCount, total: totalCount },
                )}
            </Typography>
            <Box sx={styles.legend}>
                {!isRuleView &&
                    legendRules.map(rule => (
                        <Typography
                            key={rule.id}
                            variant="caption"
                            sx={styles.legendItem}
                        >
                            <ColorDot color={rule.color} size={ruleDotSize} />
                            {rule.name}
                        </Typography>
                    ))}
                {isRuleView && showDeployedLegend && legendRules[0] && (
                    <Typography variant="caption" sx={styles.legendItem}>
                        <ColorDot
                            color={legendRules[0].color}
                            size={ruleDotSize}
                        />
                        {formatMessage(MESSAGES.assignmentTableDeployed)}
                    </Typography>
                )}
                <Typography variant="caption" sx={styles.legendItem}>
                    <Box component="span" sx={styles.changedSwatch} />
                    {formatMessage(
                        isRuleView
                            ? MESSAGES.assignmentTableChangedInThisRule
                            : MESSAGES.assignmentTableChangedInARule,
                    )}
                </Typography>
            </Box>
        </Box>
    );
};
