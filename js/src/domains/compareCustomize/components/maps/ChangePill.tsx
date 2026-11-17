import React, { FC } from 'react';
import { Typography } from '@mui/material';
import { green, red } from '@mui/material/colors';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';

const styles = {
    pill: {
        display: 'inline-flex',
        alignItems: 'center',
        height: 22,
        padding: '0 8px',
        borderRadius: 999,
        fontVariantNumeric: 'tabular-nums',
        backgroundColor: 'grey.100',
        color: 'text.primary',
    },
    densePill: {
        height: 20,
        padding: '0 6px',
    },
    favorablePill: {
        backgroundColor: green[50],
        color: 'success.main',
    },
    unfavorablePill: {
        backgroundColor: red[50],
        color: 'error.main',
    },
} satisfies SxStyles;

type Props = {
    baseline: number;
    comparison: number;
    /** When true, an increase is favorable. */
    positiveIsGreen: boolean;
    dense?: boolean;
};

/** The comparison's change relative to the baseline, e.g. "+54%"; nothing when the baseline is 0. */
export const ChangePill: FC<Props> = ({
    baseline,
    comparison,
    positiveIsGreen,
    dense = false,
}) => {
    const { formatNumber } = useSafeIntl();
    if (baseline === 0) return null;
    const delta = comparison - baseline;
    const isFavorable = delta === 0 ? undefined : delta > 0 === positiveIsGreen;
    return (
        <Typography
            variant="caption"
            component="span"
            sx={[
                styles.pill,
                dense && styles.densePill,
                isFavorable === true && styles.favorablePill,
                isFavorable === false && styles.unfavorablePill,
            ]}
        >
            {formatNumber(delta / Math.abs(baseline), {
                style: 'percent',
                maximumFractionDigits: 0,
                signDisplay: 'exceptZero',
            })}
        </Typography>
    );
};
