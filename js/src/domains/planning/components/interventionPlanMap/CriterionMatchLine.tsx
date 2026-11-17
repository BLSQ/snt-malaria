import React, { FC } from 'react';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import RemoveIcon from '@mui/icons-material/Remove';
import { Box, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../messages';

const styles = {
    root: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        color: 'text.secondary',
    },
    meetingRoot: {
        color: 'success.main',
    },
    icon: {
        fontSize: 16,
    },
} satisfies SxStyles;

type Props = {
    /** The criterion as text, e.g. "≥ 10"; undefined when its value is not set. */
    criterion?: string;
    meets?: boolean;
};

export const CriterionMatchLine: FC<Props> = ({ criterion, meets }) => {
    const { formatMessage } = useSafeIntl();
    if (criterion === undefined) {
        return (
            <Box sx={styles.root}>
                <RemoveIcon sx={styles.icon} />
                <Typography variant="caption">
                    {formatMessage(MESSAGES.tooltipCriterionValueNotSet)}
                </Typography>
            </Box>
        );
    }
    const Icon = meets ? CheckCircleOutlinedIcon : CancelOutlinedIcon;
    return (
        <Box sx={[styles.root, Boolean(meets) && styles.meetingRoot]}>
            <Icon sx={styles.icon} />
            <Typography variant="caption">
                {formatMessage(
                    meets
                        ? MESSAGES.tooltipMeetsCriterion
                        : MESSAGES.tooltipOutsideCriterion,
                    { criterion },
                )}
            </Typography>
        </Box>
    );
};
