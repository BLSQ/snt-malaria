import React, { FC, MouseEvent, ReactNode, useCallback, useState } from 'react';
import DeleteIcon from '@mui/icons-material/Delete';
import { Box, SvgIconProps, Tooltip, Typography, alpha } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import {
    HoverSwapTile,
    hoverSwapTileTrigger,
} from '../../../../../components/HoverSwapTile';
import { MESSAGES } from '../../../../messages';

const CARD_ACTION_CLASS = 'ruleItemAction';
const TILE_SIZE = 32;

// Events from portaled children (e.g. an open dropdown menu) bubble through the React tree too.
const isCardBodyEvent = ({ target, currentTarget }: MouseEvent<HTMLElement>) =>
    target instanceof Element &&
    currentTarget.contains(target) &&
    !target.closest(`.${CARD_ACTION_CLASS}`);

const styles = {
    card: {
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        minHeight: 52,
        py: 1,
        pr: 1.5,
        pl: '10px',
        ...hoverSwapTileTrigger,
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        backgroundColor: 'background.paper',
    },
    clickableCard: {
        cursor: 'pointer',
        transition: 'background-color 150ms',
        '&:hover': { backgroundColor: 'action.hover' },
    },
    selectedCard: {
        borderColor: 'primary.main',
    },
    leading: { mr: '-2px', display: 'inline-flex' },
    iconTile: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: TILE_SIZE,
        height: TILE_SIZE,
        borderRadius: 2,
        backgroundColor: 'primary.light',
        color: 'primary.main',
    },
    icon: { fontSize: 20 },
    clickHint: { display: 'block', mt: 0.5, opacity: 0.8 },
    actions: { display: 'contents' },
    labels: {
        flex: '1 1 auto',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.25,
    },
    title: {
        lineHeight: 1.3,
    },
    caption: {
        lineHeight: 1.3,
        color: 'text.secondary',
    },
    removeButton: {
        color: 'text.secondary',
        '&:hover': {
            color: 'error.main',
            backgroundColor: theme => alpha(theme.palette.error.main, 0.08),
        },
    },
} satisfies SxStyles;

type Props = {
    Icon: FC<SvgIconProps>;
    title: string;
    caption?: string;
    onRemove: () => void;
    onClick?: () => void;
    clickHint?: string;
    isSelected?: boolean;
    children?: ReactNode;
};

export const RuleItemCard: FC<Props> = ({
    Icon,
    title,
    caption,
    onRemove,
    onClick,
    clickHint,
    isSelected = false,
    children,
}) => {
    const { formatMessage } = useSafeIntl();
    const [isHintOpen, setIsHintOpen] = useState(false);
    const handleRemove = useCallback(
        (event: MouseEvent) => {
            event.stopPropagation();
            onRemove();
        },
        [onRemove],
    );
    const handleMouseOver = useCallback(
        (event: MouseEvent<HTMLElement>) =>
            setIsHintOpen(isCardBodyEvent(event)),
        [],
    );
    const handleMouseLeave = useCallback(() => setIsHintOpen(false), []);
    const handleClick = useCallback(
        (event: MouseEvent<HTMLElement>) => {
            if (isCardBodyEvent(event)) {
                onClick?.();
            }
        },
        [onClick],
    );

    return (
        <Tooltip
            open={isHintOpen}
            title={
                clickHint ? (
                    <>
                        {title}
                        <Box component="span" sx={styles.clickHint}>
                            {clickHint}
                        </Box>
                    </>
                ) : (
                    title
                )
            }
            disableHoverListener
            disableFocusListener
            disableTouchListener
        >
            <Box
                sx={[
                    styles.card,
                    Boolean(onClick) && styles.clickableCard,
                    isSelected && styles.selectedCard,
                ]}
                onClick={handleClick}
                onMouseOver={handleMouseOver}
                onMouseLeave={handleMouseLeave}
            >
                <Box sx={styles.leading}>
                    <HoverSwapTile
                        size={TILE_SIZE}
                        tile={
                            <Box component="span" sx={styles.iconTile}>
                                <Icon sx={styles.icon} />
                            </Box>
                        }
                        actionIcon={<DeleteIcon sx={styles.icon} />}
                        actionLabel={formatMessage(MESSAGES.remove)}
                        onAction={handleRemove}
                        actionClassName={CARD_ACTION_CLASS}
                        actionSx={styles.removeButton}
                    />
                </Box>
                <Box sx={styles.labels}>
                    <Typography
                        variant="body2"
                        fontWeight="medium"
                        noWrap
                        sx={styles.title}
                    >
                        {title}
                    </Typography>
                    {caption && (
                        <Typography
                            variant="caption"
                            noWrap
                            sx={styles.caption}
                        >
                            {caption}
                        </Typography>
                    )}
                </Box>
                {children && (
                    <Box className={CARD_ACTION_CLASS} sx={styles.actions}>
                        {children}
                    </Box>
                )}
            </Box>
        </Tooltip>
    );
};
