import React, { FC, MouseEvent, ReactNode, useCallback } from 'react';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { Box, IconButton, Tooltip, Typography, alpha } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../../messages';

const styles = {
    card: {
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        minHeight: 52,
        py: 1,
        pr: 1.5,
        pl: 2,
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
        flex: '0 0 auto',
        p: 0.5,
        color: 'text.disabled',
        '&:hover': {
            color: 'error.main',
            backgroundColor: theme => alpha(theme.palette.error.main, 0.08),
        },
    },
} satisfies SxStyles;

type Props = {
    title: string;
    caption?: string;
    onRemove: () => void;
    onClick?: () => void;
    isSelected?: boolean;
    children?: ReactNode;
};

export const RuleItemCard: FC<Props> = ({
    title,
    caption,
    onRemove,
    onClick,
    isSelected = false,
    children,
}) => {
    const { formatMessage } = useSafeIntl();
    const handleRemove = useCallback(
        (event: MouseEvent) => {
            event.stopPropagation();
            onRemove();
        },
        [onRemove],
    );
    return (
        <Box
            sx={[
                styles.card,
                Boolean(onClick) && styles.clickableCard,
                isSelected && styles.selectedCard,
            ]}
            onClick={onClick}
        >
            <Box sx={styles.labels}>
                <Tooltip title={title}>
                    <Typography
                        variant="body2"
                        fontWeight="medium"
                        noWrap
                        sx={styles.title}
                    >
                        {title}
                    </Typography>
                </Tooltip>
                {caption && (
                    <Typography variant="caption" noWrap sx={styles.caption}>
                        {caption}
                    </Typography>
                )}
            </Box>
            {children}
            <Tooltip title={formatMessage(MESSAGES.remove)}>
                <IconButton
                    size="small"
                    onClick={handleRemove}
                    sx={styles.removeButton}
                >
                    <DeleteOutlinedIcon fontSize="small" />
                </IconButton>
            </Tooltip>
        </Box>
    );
};
