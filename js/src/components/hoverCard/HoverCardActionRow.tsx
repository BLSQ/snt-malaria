import React, { FC } from 'react';
import Box from '@mui/material/Box/Box';
import ButtonBase from '@mui/material/ButtonBase/ButtonBase';
import Typography from '@mui/material/Typography/Typography';
import { SxStyles } from 'Iaso/types/general';
import { overrideColors } from '../../constants/overrideColors';

const styles = {
    row: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        height: 36,
        padding: '0 14px',
        textAlign: 'left',
        '&:hover': {
            backgroundColor: overrideColors.actionHoverBackground,
        },
    },
    currentRow: {
        backgroundColor: overrideColors.actionHoverBackground,
    },
    symbol: {
        flex: '0 0 14px',
        textAlign: 'center',
        color: 'primary.main',
        fontWeight: 'fontWeightMedium',
        fontSize: theme => theme.typography.pxToRem(14),
    },
    label: {
        flex: '1 1 auto',
        minWidth: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    meta: {
        flex: '0 0 auto',
        color: 'text.secondary',
        fontVariantNumeric: 'tabular-nums',
    },
    currentMeta: {
        color: 'primary.main',
    },
} satisfies SxStyles;

type Props = {
    symbol: string;
    label: string;
    meta?: string;
    isCurrent?: boolean;
    onClick: () => void;
    onHoverChange: (isHovered: boolean) => void;
};

export const HoverCardActionRow: FC<Props> = ({
    symbol,
    label,
    meta,
    isCurrent = false,
    onClick,
    onHoverChange,
}) => (
    <ButtonBase
        sx={[styles.row, isCurrent && styles.currentRow]}
        onClick={onClick}
        onMouseEnter={() => onHoverChange(true)}
        onMouseLeave={() => onHoverChange(false)}
    >
        <Box component="span" sx={styles.symbol}>
            {symbol}
        </Box>
        <Typography variant="body2" component="span" sx={styles.label}>
            {label}
        </Typography>
        {meta && (
            <Typography
                variant="caption"
                component="span"
                sx={[styles.meta, isCurrent && styles.currentMeta]}
            >
                {meta}
            </Typography>
        )}
    </ButtonBase>
);
