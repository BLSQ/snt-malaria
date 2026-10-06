import React, { FC } from 'react';
import { Box, Link, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { Link as RouterLink } from 'react-router-dom';
import { SxStyles } from 'Iaso/types/general';
import { HomeCardConfig } from '../types';

const styles = {
    card: {
        boxSizing: 'border-box',
        minHeight: 187,
        padding: '32px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 1.5,
        backgroundColor: 'background.paper',
        borderRadius: '12px',
        textAlign: 'center',
        '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: '2px',
        },
    },
    iconTile: {
        width: 40,
        height: 40,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'primary.light',
        borderRadius: '8px',
        color: 'primary.main',
    },
    icon: {
        fontSize: 22,
    },
    text: {
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
    },
    title: {
        fontSize: 20,
        lineHeight: 1.4,
        fontWeight: 500,
        color: 'text.primary',
    },
    caption: {
        fontSize: 13,
        lineHeight: 1.5,
        letterSpacing: '0.02em',
        color: 'text.secondary',
    },
} satisfies SxStyles;

type Props = {
    card: HomeCardConfig;
};

export const HomeCard: FC<Props> = ({ card }) => {
    const { formatMessage } = useSafeIntl();
    const { Icon, to } = card;
    return (
        <Link component={RouterLink} to={to} underline="none" sx={styles.card}>
            <Box sx={styles.iconTile}>
                <Icon sx={styles.icon} />
            </Box>
            <Box sx={styles.text}>
                <Typography component="h2" sx={styles.title}>
                    {formatMessage(card.title)}
                </Typography>
                <Typography sx={styles.caption}>
                    {formatMessage(card.caption)}
                </Typography>
            </Box>
        </Link>
    );
};
