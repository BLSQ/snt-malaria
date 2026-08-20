import React, { FC } from 'react';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import { Box, IconButton, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { SxStyles } from 'Iaso/types/general';
import { DeltaChip } from '../../../compareCustomize/components/DeltaChip';
import { MetricEntry } from '../../../compareCustomize/components/MetricCard';
import { MESSAGES } from '../../../messages';
import { ScenarioOption } from './useComparisonSlots';

const YEAR_FIELD_WIDTH = 108;
const SCENARIO_FIELD_WIDTH = 176;
const REMOVE_BUTTON_WIDTH = 32;

const styles = {
    card: {
        backgroundColor: 'common.white',
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 2,
        py: 1.25,
        height: '100%',
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: '50%',
        flexShrink: 0,
    },
    currentLabel: {
        fontWeight: 600,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        minWidth: 0,
    },
    scenarioSelectWrap: {
        minWidth: SCENARIO_FIELD_WIDTH,
        flexShrink: 0,
        '& .MuiInputLabel-shrink': {
            backgroundColor: 'transparent !important',
        },
    },
    yearSelectWrap: {
        width: YEAR_FIELD_WIDTH,
        flexShrink: 0,
        '& .MuiInputLabel-shrink': {
            backgroundColor: 'transparent !important',
        },
    },
    spacer: {
        flex: 1,
        minWidth: 8,
    },
    totals: {
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexShrink: 0,
    },
    removeButton: {
        p: 0.5,
        color: 'text.secondary',
        '&:hover': {
            color: 'error.main',
            backgroundColor: 'transparent',
        },
    },
    removePlaceholder: {
        width: REMOVE_BUTTON_WIDTH,
        flexShrink: 0,
    },
} satisfies SxStyles;

type Props = {
    color: string;
    isCurrent: boolean;
    currentScenarioLabel?: string;
    scenarioValue?: number;
    scenarioOptions?: ScenarioOption[];
    onScenarioChange?: (key: string, value: unknown) => void;
    slotNumber?: number;
    year: number;
    yearOptions: { label: string; value: number }[];
    onYearChange: (key: string, value: unknown) => void;
    onRemove?: () => void;
    metricEntry?: MetricEntry<string>;
};

export const ScenarioSlotWidget: FC<Props> = ({
    color,
    isCurrent,
    currentScenarioLabel,
    scenarioValue,
    scenarioOptions,
    onScenarioChange,
    slotNumber,
    year,
    yearOptions,
    onYearChange,
    onRemove,
    metricEntry,
}) => {
    const { formatMessage } = useSafeIntl();

    return (
        <Box sx={styles.card}>
            <Box sx={[styles.dot, { backgroundColor: color }]} />
            {isCurrent ? (
                <Typography variant="body2" sx={styles.currentLabel}>
                    {currentScenarioLabel}
                </Typography>
            ) : (
                <Box sx={styles.scenarioSelectWrap}>
                    <InputComponent
                        keyValue={`comparison_scenario_${slotNumber}`}
                        type="select"
                        labelString={formatMessage(
                            MESSAGES.scenarioLabelWithIndex,
                            { index: String(slotNumber ?? 0) },
                        )}
                        value={scenarioValue}
                        options={scenarioOptions ?? []}
                        clearable={false}
                        onChange={onScenarioChange}
                        withMarginTop={false}
                        wrapperSx={{ width: '100%' }}
                    />
                </Box>
            )}
            <Box sx={styles.yearSelectWrap}>
                <InputComponent
                    keyValue={`comparison_year_${slotNumber ?? 'current'}`}
                    type="select"
                    labelString={formatMessage(MESSAGES.comparisonYearLabel)}
                    value={year}
                    options={yearOptions}
                    clearable={false}
                    onChange={onYearChange}
                    withMarginTop={false}
                    wrapperSx={{ width: '100%' }}
                />
            </Box>
            <Box sx={styles.spacer} />
            {metricEntry && (
                <Box sx={styles.totals}>
                    <Typography variant="subtitle1" fontWeight={600} noWrap>
                        {metricEntry.value}
                    </Typography>
                    {metricEntry.chip && <DeltaChip {...metricEntry.chip} />}
                </Box>
            )}
            {onRemove ? (
                <IconButton
                    size="small"
                    onClick={onRemove}
                    sx={styles.removeButton}
                    aria-label={formatMessage(
                        MESSAGES.comparisonRemoveScenario,
                    )}
                >
                    <CloseOutlinedIcon fontSize="small" />
                </IconButton>
            ) : (
                <Box sx={styles.removePlaceholder} />
            )}
        </Box>
    );
};
