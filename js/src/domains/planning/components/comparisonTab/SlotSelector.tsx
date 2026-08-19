import React, { FC } from 'react';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import { Box, ButtonBase, IconButton, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../messages';
import { ScenarioOption, useComparisonSlots } from './useComparisonSlots';

const YEAR_FIELD_WIDTH = 108;

const styles = {
    root: {
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 1.5,
    },
    slot: {
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        borderRadius: 3,
        backgroundColor: 'grey.100',
        pl: 1.5,
        pr: 1,
        py: 0.75,
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
    },
    scenarioSelectWrap: {
        minWidth: 168,
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
    removeButton: {
        p: 0.5,
        color: 'text.secondary',
        '&:hover': {
            color: 'error.main',
            backgroundColor: 'transparent',
        },
    },
    versus: {
        color: 'text.disabled',
        fontWeight: 600,
        letterSpacing: '0.06em',
        px: 0.25,
    },
    addSlot: {
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        borderRadius: 3,
        border: '1px dashed',
        borderColor: 'divider',
        color: 'text.secondary',
        px: 1.5,
        py: 0.875,
        typography: 'body2',
        '&:hover': {
            borderColor: 'primary.main',
            color: 'primary.main',
            backgroundColor: 'transparent',
        },
    },
} satisfies SxStyles;

type Props = {
    slots: ReturnType<typeof useComparisonSlots>['extraSlots'];
    currentScenarioLabel: string;
    currentYear: number;
    currentYearOptions: { label: string; value: number }[];
    scenarioOptionsForSlot: (index: number) => ScenarioOption[];
    yearOptionsFor: (scenarioId?: number) => { label: string; value: number }[];
    onCurrentYearChange: (key: string, value: unknown) => void;
    onSlotScenarioChange: (
        index: number,
    ) => (key: string, value: unknown) => void;
    onSlotYearChange: (index: number) => (key: string, value: unknown) => void;
    onAddSlot: () => void;
    onRemoveSlot: (index: number) => void;
    canAddSlot: boolean;
    colorForIndex: (index: number) => string;
};

export const SlotSelector: FC<Props> = ({
    slots,
    currentScenarioLabel,
    currentYear,
    currentYearOptions,
    scenarioOptionsForSlot,
    yearOptionsFor,
    onCurrentYearChange,
    onSlotScenarioChange,
    onSlotYearChange,
    onAddSlot,
    onRemoveSlot,
    canAddSlot,
    colorForIndex,
}) => {
    const { formatMessage } = useSafeIntl();

    return (
        <Box sx={styles.root}>
            <Box sx={styles.slot}>
                <Box sx={[styles.dot, { backgroundColor: colorForIndex(0) }]} />
                <Typography variant="body2" sx={styles.currentLabel}>
                    {currentScenarioLabel}
                </Typography>
                <Box sx={styles.yearSelectWrap}>
                    <InputComponent
                        keyValue="current_year"
                        type="select"
                        labelString={formatMessage(MESSAGES.comparisonYearLabel)}
                        value={currentYear}
                        options={currentYearOptions}
                        clearable={false}
                        onChange={onCurrentYearChange}
                        withMarginTop={false}
                        wrapperSx={{ width: '100%' }}
                    />
                </Box>
            </Box>
            {slots.map((slot, index) => (
                <Box
                    key={`comparison-slot-${index}`}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}
                >
                    <Typography variant="body2" sx={styles.versus}>
                        {formatMessage(MESSAGES.comparisonVersusLabel)}
                    </Typography>
                    <Box sx={styles.slot}>
                        <Box
                            sx={[
                                styles.dot,
                                { backgroundColor: colorForIndex(index + 1) },
                            ]}
                        />
                        <Box sx={styles.scenarioSelectWrap}>
                            <InputComponent
                                keyValue={`comparison_scenario_${index}`}
                                type="select"
                                labelString={formatMessage(
                                    MESSAGES.scenarioLabelWithIndex,
                                    { index: index + 1 },
                                )}
                                value={slot.scenarioId}
                                options={scenarioOptionsForSlot(index)}
                                clearable={false}
                                onChange={onSlotScenarioChange(index)}
                                withMarginTop={false}
                                wrapperSx={{ width: '100%' }}
                            />
                        </Box>
                        <Box sx={styles.yearSelectWrap}>
                            <InputComponent
                                keyValue={`comparison_year_${index}`}
                                type="select"
                                labelString={formatMessage(
                                    MESSAGES.comparisonYearLabel,
                                )}
                                value={slot.year}
                                options={yearOptionsFor(slot.scenarioId)}
                                clearable={false}
                                onChange={onSlotYearChange(index)}
                                withMarginTop={false}
                                wrapperSx={{ width: '100%' }}
                            />
                        </Box>
                        <IconButton
                            size="small"
                            onClick={() => onRemoveSlot(index)}
                            sx={styles.removeButton}
                            aria-label={formatMessage(
                                MESSAGES.comparisonRemoveScenario,
                            )}
                        >
                            <CloseOutlinedIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </Box>
            ))}
            {canAddSlot && (
                <ButtonBase sx={styles.addSlot} onClick={onAddSlot}>
                    <AddOutlinedIcon fontSize="small" />
                    {formatMessage(MESSAGES.comparisonAddScenario)}
                </ButtonBase>
            )}
        </Box>
    );
};
