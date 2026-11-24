import React, { FC, ReactNode } from 'react';
import Box from '@mui/material/Box/Box';
import Typography from '@mui/material/Typography/Typography';
import { SxStyles } from 'Iaso/types/general';
import { overrideColors } from '../../constants/overrideColors';

const styles = {
    list: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
    },
    chip: {
        boxSizing: 'border-box',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        height: 24,
        padding: '0 8px',
        borderRadius: 999,
        backgroundColor: 'grey.100',
        color: 'text.primary',
    },
    struckChip: {
        backgroundColor: 'transparent',
        border: theme => `1px dashed ${theme.palette.grey[400]}`,
        color: overrideColors.notApplicableText,
    },
    sign: {
        fontWeight: 'fontWeightBold',
    },
    tintedLabel: {
        fontWeight: 'fontWeightMedium',
    },
    struckLabel: {
        textDecoration: 'line-through',
    },
} satisfies SxStyles;

export const TooltipChipList: FC<{ children: ReactNode }> = ({ children }) => (
    <Box sx={styles.list}>{children}</Box>
);

type Props = {
    label: string;
    /** Fills the chip; without it the chip is neutral grey. */
    color?: string;
    /** Light background with matching text, e.g. in a scenario's colour. */
    tint?: { background: string; text: string };
    sign?: string;
    /** Marks something taken away, e.g. an intervention the scenario drops. */
    struck?: boolean;
};

export const TooltipChip: FC<Props> = ({
    label,
    color,
    tint,
    sign,
    struck,
}) => (
    <Box
        sx={[
            styles.chip,
            color
                ? {
                      backgroundColor: color,
                      color: theme => theme.palette.getContrastText(color),
                  }
                : false,
            tint
                ? { backgroundColor: tint.background, color: tint.text }
                : false,
            Boolean(struck) && styles.struckChip,
        ]}
    >
        {sign && (
            <Typography variant="caption" sx={styles.sign}>
                {sign}
            </Typography>
        )}
        <Typography
            variant="caption"
            sx={[
                Boolean(struck) && styles.struckLabel,
                Boolean(tint) && styles.tintedLabel,
            ]}
        >
            {label}
        </Typography>
    </Box>
);
