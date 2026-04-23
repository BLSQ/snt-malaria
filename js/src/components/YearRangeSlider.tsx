import React, { FC, useMemo } from 'react';
import { Box, Slider } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';

type Props = {
    yearRange: [number, number];
    value: [number, number];
    onChange: (range: [number, number]) => void;
};

const styles = {
    sliderContainer: {
        px: 1.5,
        '& .MuiSlider-root': {
            width: theme => `calc(100% - ${theme.spacing(1)})`,
            ml: 0.5,
        },
        '& .MuiSlider-markLabel': {
            fontSize: '0.75rem',
            color: 'text.secondary',
        },
    },
} satisfies SxStyles;

export const YearRangeSlider: FC<Props> = ({ yearRange, value, onChange }) => {
    const marks = useMemo(
        () => [
            { value: yearRange[0], label: String(yearRange[0]) },
            { value: yearRange[1], label: String(yearRange[1]) },
        ],
        [yearRange],
    );

    return (
        <Box sx={styles.sliderContainer}>
            <Slider
                value={value}
                onChange={(_event: Event, newValue: number | number[]) => {
                    if (Array.isArray(newValue) && newValue.length === 2) {
                        onChange([newValue[0], newValue[1]]);
                    }
                }}
                min={yearRange[0]}
                max={yearRange[1]}
                step={1}
                marks={marks}
                valueLabelDisplay="auto"
                disableSwap
            />
        </Box>
    );
};
