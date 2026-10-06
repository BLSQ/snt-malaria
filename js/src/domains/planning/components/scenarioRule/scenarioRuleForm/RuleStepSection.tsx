import React, { FC, ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';

const styles = {
    section: {
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        mb: 1,
    },
    stepBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: '0 0 24px',
        width: 24,
        height: 24,
        borderRadius: '50%',
        backgroundColor: 'primary.light',
        color: 'primary.main',
        typography: 'body2',
        fontWeight: 'medium',
    },
    description: {
        display: 'block',
        color: 'text.secondary',
        lineHeight: 1.5,
        mt: -0.5,
    },
    subSectionTitle: {
        mt: 1,
    },
} satisfies SxStyles;

type Props = {
    step: number;
    title: string;
    description?: string;
    children: ReactNode;
};

export const RuleStepSection: FC<Props> = ({
    step,
    title,
    description,
    children,
}) => (
    <Box sx={styles.section}>
        <Box sx={styles.header}>
            <Box component="span" sx={styles.stepBadge}>
                {step}
            </Box>
            <Typography variant="subtitle1" fontWeight="medium">
                {title}
            </Typography>
        </Box>
        {description && (
            <Typography variant="caption" sx={styles.description}>
                {description}
            </Typography>
        )}
        {children}
    </Box>
);

type SubSectionProps = {
    title: string;
    description?: string;
};

export const RuleStepSubSectionHeader: FC<SubSectionProps> = ({
    title,
    description,
}) => (
    <>
        <Typography
            variant="body2"
            fontWeight="medium"
            sx={styles.subSectionTitle}
        >
            {title}
        </Typography>
        {description && (
            <Typography variant="caption" sx={styles.description}>
                {description}
            </Typography>
        )}
    </>
);
