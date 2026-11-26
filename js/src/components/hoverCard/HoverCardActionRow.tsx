import React, { FC, useCallback } from 'react';
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
    id: string;
    symbol: string;
    label: string;
    meta?: string;
    isCurrent?: boolean;
    onClick: (id: string) => void;
    onHover: (id: string) => void;
};

export const HoverCardActionRow: FC<Props> = ({
    id,
    symbol,
    label,
    meta,
    isCurrent = false,
    onClick,
    onHover,
}) => {
    const handleClick = useCallback(() => onClick(id), [onClick, id]);
    const handleMouseEnter = useCallback(() => onHover(id), [onHover, id]);
    return (
        <ButtonBase
            sx={[styles.row, isCurrent && styles.currentRow]}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
        >
            <Box component="span" sx={styles.symbol}>
                {symbol}
            </Box>
            <Typography
                variant="body2"
                component="span"
                noWrap
                sx={styles.label}
            >
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
};
