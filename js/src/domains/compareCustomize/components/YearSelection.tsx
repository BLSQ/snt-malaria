import React, { FC, useCallback, useMemo, useState } from 'react';
import DateRangeOutlinedIcon from '@mui/icons-material/DateRangeOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import {
    Box,
    Slider,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { ToggleButtonLabel } from '../../../components/ToggleButtonLabel';
import { useElementSize } from '../../../hooks/useElementSize';
import { MESSAGES } from '../../messages';
import { YearMode } from '../types';
import {
    labelledYears,
    labelStride,
    YEAR_LABEL_WIDTH,
} from '../utils/yearSelection';

type Props = {
    yearRange: [number, number];
    yearMode: YearMode;
    onYearModeChange: (mode: YearMode) => void;
    selectedYearRange: [number, number];
    onYearRangeChange: (range: [number, number]) => void;
    selectedSingleYear: number;
    onSingleYearChange: (year: number) => void;
};

const styles = {
    root: {
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
    },
    toggleButton: { flex: 1 },
    modeHint: {
        color: 'text.secondary',
    },
    sliderContainer: {
        px: `${YEAR_LABEL_WIDTH / 2}px`,
        mt: 0.5,
        '& .MuiSlider-root': {
            mb: 4,
        },
        '& .MuiSlider-markLabel': {
            top: 38,
        },
    },
    yearLabel: {
        display: 'inline-block',
        width: YEAR_LABEL_WIDTH,
        boxSizing: 'border-box',
        textAlign: 'center',
        py: 0.5,
        borderRadius: 1,
        fontSize: '0.75rem',
        color: 'text.secondary',
    },
    selectedYearLabel: {
        fontWeight: 500,
        backgroundColor: 'primary.light',
        color: 'primary.main',
    },
} satisfies SxStyles;

export const YearSelection: FC<Props> = ({
    yearRange,
    yearMode,
    onYearModeChange,
    selectedYearRange,
    onYearRangeChange,
    selectedSingleYear,
    onSingleYearChange,
}) => {
    const { formatMessage } = useSafeIntl();
    const isSingleYear = yearMode === 'single';

    const { ref: sliderRef, size: sliderSize } =
        useElementSize<HTMLSpanElement>();
    const sliderWidth = sliderSize?.width ?? 0;
    const [isYearLabelClick, setIsYearLabelClick] = useState(false);

    const marks = useMemo(() => {
        const stride = labelStride(
            sliderWidth,
            yearRange[1] - yearRange[0] + 1,
        );
        const isSelected = (year: number) =>
            isSingleYear
                ? year === selectedSingleYear
                : year === selectedYearRange[0] ||
                  year === selectedYearRange[1];
        return labelledYears(yearRange, stride).map(year => ({
            value: year,
            label: (
                <Box
                    component="span"
                    sx={[
                        styles.yearLabel,
                        isSelected(year) && styles.selectedYearLabel,
                    ]}
                >
                    {year}
                </Box>
            ),
        }));
    }, [
        sliderWidth,
        yearRange,
        isSingleYear,
        selectedSingleYear,
        selectedYearRange,
    ]);

    const handleModeChange = useCallback(
        (_event: React.MouseEvent<HTMLElement>, nextMode: YearMode | null) => {
            if (nextMode) onYearModeChange(nextMode);
        },
        [onYearModeChange],
    );

    const handleSliderPointerDown = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            setIsYearLabelClick(
                (event.target as HTMLElement).closest(
                    '.MuiSlider-markLabel',
                ) !== null,
            );
        },
        [],
    );

    const handleSliderChange = useCallback(
        (_event: Event, newValue: number | number[]) => {
            if (Array.isArray(newValue)) {
                if (newValue.length === 2) {
                    onYearRangeChange([newValue[0], newValue[1]]);
                }
            } else {
                onSingleYearChange(newValue);
            }
        },
        [onYearRangeChange, onSingleYearChange],
    );

    return (
        <Box sx={styles.root}>
            <ToggleButtonGroup
                value={yearMode}
                exclusive
                fullWidth
                size="small"
                onChange={handleModeChange}
            >
                <ToggleButton value="range" sx={styles.toggleButton}>
                    <ToggleButtonLabel
                        icon={DateRangeOutlinedIcon}
                        label={formatMessage(MESSAGES.yearModeRange)}
                    />
                </ToggleButton>
                <ToggleButton value="single" sx={styles.toggleButton}>
                    <ToggleButtonLabel
                        icon={EventOutlinedIcon}
                        label={formatMessage(MESSAGES.yearModeSingle)}
                    />
                </ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" component="p" sx={styles.modeHint}>
                {formatMessage(
                    isSingleYear
                        ? MESSAGES.yearModeSingleHint
                        : MESSAGES.yearModeRangeHint,
                )}
            </Typography>
            <Box
                sx={styles.sliderContainer}
                onPointerDownCapture={handleSliderPointerDown}
            >
                <Slider
                    ref={sliderRef}
                    value={
                        isSingleYear ? selectedSingleYear : selectedYearRange
                    }
                    onChange={handleSliderChange}
                    min={yearRange[0]}
                    max={yearRange[1]}
                    step={1}
                    marks={marks}
                    track={isSingleYear ? false : 'normal'}
                    valueLabelDisplay={isYearLabelClick ? 'off' : 'auto'}
                    disableSwap
                />
            </Box>
        </Box>
    );
};
