import React, { FC, ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import { blueGrey } from '@mui/material/colors';
import { LoadingSpinner } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';

type Props = {
    title: string;
    icon?: React.ElementType;
    iconSx?: Record<string, unknown>;
    actions?: ReactNode;
    cardSx?: Record<string, unknown>;
    headerSx?: Record<string, unknown>;
    bodySx?: Record<string, unknown>;
    isLoading?: boolean;
    children?: ReactNode;
};

const styles = {
    card: {
        backgroundColor: 'common.white',
        borderRadius: 4,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        p: 2,
        gap: 2,
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
    },
    titleWrapper: {
        display: 'flex',
        alignItems: 'center',
        gap: 1,
    },
    iconBox: {
        backgroundColor: blueGrey[50],
        p: 0.5,
        borderRadius: 2,
        lineHeight: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: '1rem',
        fontWeight: 500,
        color: 'text.primary',
    },
    body: {
        position: 'relative',
        flex: 1,
        minHeight: 0,
    },
    loadingOverlay: {
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'common.white',
        opacity: 0.7,
        zIndex: 1100,
    },
} satisfies SxStyles;

export const Card: FC<Props> = ({
    title,
    icon,
    iconSx,
    actions,
    children,
    cardSx,
    headerSx,
    bodySx,
    isLoading,
}) => (
    <Box sx={{ ...styles.card, ...cardSx }}>
        <Box sx={{ ...styles.header, ...headerSx }}>
            <Box sx={styles.titleWrapper}>
                {icon && (
                    <Box sx={styles.iconBox}>
                        {React.createElement(icon, {
                            sx: { color: blueGrey[400], ...iconSx },
                        })}
                    </Box>
                )}
                <Typography sx={styles.title}>{title}</Typography>
            </Box>
            {actions}
        </Box>
        <Box sx={{ ...styles.body, ...bodySx }}>
            {children}
            {isLoading && (
                <Box sx={styles.loadingOverlay}>
                    <LoadingSpinner
                        size={32}
                        absolute
                        fixed={false}
                        transparent
                    />
                </Box>
            )}
        </Box>
    </Box>
);
