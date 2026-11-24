import React, { FC } from 'react';
import Box from '@mui/material/Box/Box';
import Typography from '@mui/material/Typography/Typography';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../domains/messages';
import { useFormatMetricValue } from '../../hooks/useFormatMetricValue';
import { hoverCardSpacing } from './hoverCardSpacing';

const styles = {
    root: {
        display: 'flex',
        flexDirection: 'column',
        gap: hoverCardSpacing.pair,
    },
    valueRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    swatch: {
        flex: '0 0 14px',
        width: 14,
        height: 14,
        borderRadius: theme => `${theme.shape.borderRadius}px`,
    },
    value: {
        fontWeight: 'fontWeightMedium',
        fontVariantNumeric: 'tabular-nums',
    },
    caption: {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
} satisfies SxStyles;

type Props = {
    caption: string;
    /** Undefined when the org unit has no value for this layer. */
    value?: string | number;
    unitSymbol?: string;
    color?: string;
};

export const HoverCardValue: FC<Props> = ({
    caption,
    value,
    unitSymbol,
    color,
}) => {
    const { formatMessage } = useSafeIntl();
    const formatMetricValue = useFormatMetricValue();
    return (
        <Box sx={styles.root}>
            {value === undefined ? (
                <Typography variant="body2" color="text.secondary">
                    {formatMessage(MESSAGES.tooltipNoData)}
                </Typography>
            ) : (
                <Box sx={styles.valueRow}>
                    <Box sx={styles.swatch} bgcolor={color} />
                    <Typography variant="h6" sx={styles.value}>
                        {formatMetricValue(value, unitSymbol)}
                    </Typography>
                </Box>
            )}
            <Typography
                variant="caption"
                color="text.secondary"
                sx={styles.caption}
            >
                {caption}
            </Typography>
        </Box>
    );
};
