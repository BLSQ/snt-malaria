import React, { FC, MouseEvent, ReactNode, useMemo } from 'react';
import { Box, IconButton, SxProps, Theme, Tooltip } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';

const TILE_CLASS = 'hoverSwapTile-tile';
const ACTION_CLASS = 'hoverSwapTile-action';

/** Spread into the hover container's styles: hovering it swaps every HoverSwapTile inside to its action. */
export const hoverSwapTileTrigger = {
    [`&:hover .${TILE_CLASS}, &:has(.${ACTION_CLASS}.Mui-focusVisible) .${TILE_CLASS}`]:
        { visibility: 'hidden' },
    [`&:hover .${ACTION_CLASS}`]: { opacity: 1 },
};

const styles = {
    root: {
        position: 'relative',
        display: 'inline-flex',
    },
    tile: { display: 'contents' },
    action: {
        position: 'absolute',
        inset: 0,
        borderRadius: 2,
        opacity: 0,
        '&.Mui-focusVisible': { opacity: 1 },
    },
} satisfies SxStyles;

type Props = {
    size: number;
    tile: ReactNode;
    actionIcon?: ReactNode;
    actionLabel?: string;
    onAction?: (event: MouseEvent) => void;
    actionClassName?: string;
    actionSx?: SxProps<Theme>;
};

/** A tile that is replaced by an action button while its container is hovered. */
export const HoverSwapTile: FC<Props> = ({
    size,
    tile,
    actionIcon,
    actionLabel,
    onAction,
    actionClassName,
    actionSx,
}) => {
    const rootSx = useMemo(
        () => [styles.root, { flex: `0 0 ${size}px`, width: size, height: size }],
        [size],
    );
    const buttonSx = useMemo(
        () => [
            styles.action,
            { width: size, height: size },
            ...(Array.isArray(actionSx) ? actionSx : [actionSx]),
        ],
        [actionSx, size],
    );
    return (
        <Box sx={rootSx}>
            <Box className={TILE_CLASS} sx={styles.tile}>
                {tile}
            </Box>
            {actionIcon && onAction && (
                <Tooltip title={actionLabel ?? ''}>
                    <IconButton
                        className={
                            actionClassName
                                ? `${ACTION_CLASS} ${actionClassName}`
                                : ACTION_CLASS
                        }
                        aria-label={actionLabel}
                        onClick={onAction}
                        sx={buttonSx}
                    >
                        {actionIcon}
                    </IconButton>
                </Tooltip>
            )}
        </Box>
    );
};
