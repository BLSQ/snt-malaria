import React, { FC } from 'react';
import Box from '@mui/material/Box/Box';
import Typography from '@mui/material/Typography/Typography';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { hoverCardSpacing } from '../../../../components/hoverCard/hoverCardSpacing';
import { MESSAGES } from '../../../messages';
import { OrgUnitComparison } from '../../utils/impactCalculations';
import { ChangePill } from './ChangePill';

const styles = {
    root: {
        display: 'flex',
        flexDirection: 'column',
        gap: hoverCardSpacing.pair,
    },
    valueRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 1,
    },
    value: {
        fontWeight: 'fontWeightMedium',
        fontVariantNumeric: 'tabular-nums',
    },
} satisfies SxStyles;

type Props = {
    metricLabel: string;
    /** Formatted change from the baseline; undefined when the district has no data. */
    change?: string;
    values?: OrgUnitComparison;
    positiveIsGreen: boolean;
};

export const ImpactDifferenceTooltipBody: FC<Props> = ({
    metricLabel,
    change,
    values,
    positiveIsGreen,
}) => {
    const { formatMessage } = useSafeIntl();
    return (
        <Box sx={styles.root}>
            <Typography variant="caption" color="text.secondary">
                {metricLabel}
            </Typography>
            {change === undefined ? (
                <Typography variant="body2" color="text.secondary">
                    {formatMessage(MESSAGES.tooltipNoData)}
                </Typography>
            ) : (
                <Box sx={styles.valueRow}>
                    <Typography variant="h6" sx={styles.value}>
                        {change}
                    </Typography>
                    {values && (
                        <ChangePill
                            baseline={values.baseline}
                            comparison={values.comparison}
                            positiveIsGreen={positiveIsGreen}
                        />
                    )}
                </Box>
            )}
        </Box>
    );
};
