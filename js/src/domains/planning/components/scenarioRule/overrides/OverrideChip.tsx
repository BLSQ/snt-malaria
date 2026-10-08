import React, { FC } from 'react';
import { Box } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { overrideColors } from '../../../../../constants/overrideColors';
import { MESSAGES } from '../../../../messages';

const styles = {
    chip: {
        flex: '0 0 auto',
        display: 'inline-flex',
        alignItems: 'center',
        height: 22,
        px: 1,
        borderRadius: 999,
        backgroundColor: overrideColors.overriddenBackground,
        color: overrideColors.overriddenText,
        typography: 'caption',
        fontWeight: 'medium',
        whiteSpace: 'nowrap',
    },
} satisfies SxStyles;

type Props = {
    count: number;
};

export const OverrideChip: FC<Props> = ({ count }) => {
    const { formatMessage } = useSafeIntl();
    return (
        <Box component="span" sx={styles.chip}>
            {formatMessage(MESSAGES.overrideCount, { count })}
        </Box>
    );
};
