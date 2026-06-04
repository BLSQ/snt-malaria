import React, { FC, useCallback } from 'react';
import { Box, Tooltip } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { theme } from '../constants/theme';

type Props = {
    values: number[];
    colors: string[];
    max: number;
    tooltips?: string[];
};

const style = {
    linearProgress: {
        display: 'flex',
        width: '100%',
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.palette.grey[200],
        overflow: 'hidden',
    },
    segment: {
        height: '100%',
        '&:first-of-type': {
            borderTopLeftRadius: 5,
            borderBottomLeftRadius: 5,
        },
        '&:last-child': {
            borderTopRightRadius: 5,
            borderBottomRightRadius: 5,
        },
    },
} satisfies SxStyles;

export const ProgressBar: FC<Props> = ({ values, max, colors, tooltips }) => {
    const getTooltipTitle = useCallback(
        (index: number) => {
            const tooltip = tooltips?.[index];
            if (!tooltip)
                return `${Math.round((values[index] / max) * 10000) / 100}%`;

            return `${tooltip}: ${Math.round((values[index] / max) * 10000) / 100}%`;
        },
        [tooltips, values, max],
    );

    const calculateWidth = useCallback(
        (value: number) => (max <= 0 ? 0 : (value / max) * 100),
        [max],
    );

    return (
        <Box style={style.linearProgress}>
            {values.map((value, index) => (
                <Tooltip
                    key={colors[index] + value}
                    title={getTooltipTitle(index)}
                    arrow
                >
                    <Box
                        sx={{
                            ...style.segment,
                            width: `${calculateWidth(value)}%`,
                            backgroundColor: colors[index],
                        }}
                    />
                </Tooltip>
            ))}
        </Box>
    );
};
