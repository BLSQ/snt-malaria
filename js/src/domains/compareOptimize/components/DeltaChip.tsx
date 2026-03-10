import React, { FC } from 'react';
import { Box } from '@mui/material';
import { green, red } from '@mui/material/colors';
import { SxStyles } from 'Iaso/types/general';

export type DeltaChipProps = {
    label: string;
    variant: 'green' | 'red';
};

export type DeltaChipOptions = {
    /**
     * How the delta between `value` and `baseline` is computed:
     *
     * - `true`  — relative percentage change: `(value - baseline) / baseline`.
     *   Use for metrics where the magnitude of the baseline matters
     *
     * - `false` — absolute difference: `value - baseline`, displayed as
     *   percentage points. Use for metrics that are already ratios
     */
    relative: boolean;
    /**
     * Controls the chip colour polarity:
     *
     * - `true`  — a positive delta is green (good). Use when higher is better
     *
     * - `false` — a positive delta is red (bad). Use when lower is better
     */
    positiveIsGreen: boolean;
};

/**
 * Builds `DeltaChipProps` comparing `value` to `baseline`.
 * Returns `undefined` when either input is missing, the delta is zero,
 * or a relative delta would divide by zero.
 */
export const getDeltaChip = (
    value: number | undefined,
    baseline: number | undefined,
    { relative, positiveIsGreen }: DeltaChipOptions,
): DeltaChipProps | undefined => {
    if (!value || !baseline) return undefined;

    const delta = relative
        ? (value - baseline) / baseline
        : value - baseline;
    if (delta === 0) return undefined;

    const isPositive = delta > 0;
    return {
        label: `${isPositive ? '+' : ''}${Math.round(delta * 100)}%`,
        variant: positiveIsGreen === isPositive ? 'green' : 'red',
    };
};

const styles = {
    root: {
        ml: 'auto',
        py: 0.5,
        px: 1,
        borderRadius: 4,
        typography: 'body1',
    },
    green: {
        backgroundColor: green[50],
        color: 'success.main',
    },
    red: {
        backgroundColor: red[50],
        color: 'error.main',
    },
} satisfies SxStyles;

export const DeltaChip: FC<DeltaChipProps> = ({ label, variant }) => (
    <Box
        component="span"
        sx={[
            styles.root,
            styles[variant],
        ]}
    >
        {label}
    </Box>
);
