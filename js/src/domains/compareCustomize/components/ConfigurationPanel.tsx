import React, { FC, ReactNode } from 'react';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import RemoveOutlinedIcon from '@mui/icons-material/RemoveOutlined';
import { Box, IconButton, Theme, Typography } from '@mui/material';
import { blueGrey } from '@mui/material/colors';
import { alpha } from '@mui/material/styles';
import { LoadingSpinner, useSafeIntl } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { SxStyles } from 'Iaso/types/general';
import { DropdownOptions } from 'Iaso/types/utils';
import { ColorDot } from '../../../components/ColorDot';
import { YearRangeSlider } from '../../../components/YearRangeSlider';
import { MESSAGES } from '../../messages';
import { ScenarioId } from '../types';
import { getScenarioColor } from '../utils/colors';

type Props = {
    baselineScenarioId: ScenarioId;
    comparisonScenarioIds: ScenarioId[];
    scenarioOptions: DropdownOptions<number>[];
    comparisonOptions: DropdownOptions<number>[];
    onBaselineSelect: (_key: string, value: unknown) => void;
    onComparisonSelect: (
        index: number,
    ) => (_key: string, value: unknown) => void;
    onAddComparison: () => void;
    onRemoveComparison: (index: number) => void;
    yearRange?: [number, number];
    selectedYearRange?: [number, number];
    onYearRangeChange?: (range: [number, number]) => void;
    isYearRangeLoading?: boolean;
    ageGroups?: string[];
    selectedAgeGroup?: string;
    onAgeGroupChange?: (_key: string, value: unknown) => void;
    children?: ReactNode;
};

const styles = {
    scenarioRow: {
        display: 'grid',
        alignItems: 'center',
        gridTemplateColumns: theme => `max-content 1fr ${theme.spacing(4)}`,
        columnGap: 2,
        mt: 2,
    },
    scenarioSelectWrap: {
        minWidth: 0,
        '& .MuiInputLabel-shrink': {
            backgroundColor: 'transparent !important',
        },
    },
    iconButton: {
        p: 0.5,
        color: blueGrey[400],
        backgroundColor: 'transparent',
        '&:hover': {
            backgroundColor: blueGrey[50],
        },
    },
    removeButton: {
        width: theme => theme.spacing(4),
        minWidth: theme => theme.spacing(4),
    },
    spacerButton: {
        ml: 1,
        visibility: 'hidden',
        width: theme => theme.spacing(4),
        minWidth: theme => theme.spacing(4),
    },
    section: {
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
    },
    sectionTitle: {
        fontSize: '1rem',
        fontWeight: 500,
        color: 'text.primary',
        mt: 2,
    },
    subLabel: {
        color: 'text.primary',
        mb: 1,
    },
    card: {
        backgroundColor: (theme: Theme) =>
            alpha(theme.palette.common.white, 0.5),
        borderRadius: 4,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        p: 2,
        gap: 2,
    },
    cardHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
    },
    cardTitle: {
        fontSize: '1rem',
        fontWeight: 500,
        color: 'text.primary',
    },
    loadingCenter: {
        display: 'flex',
        justifyContent: 'center',
    },
    cardBody: {
        position: 'relative',
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
    },
} satisfies SxStyles;

export const ConfigurationPanel: FC<Props> = ({
    baselineScenarioId,
    comparisonScenarioIds,
    scenarioOptions,
    comparisonOptions,
    onBaselineSelect,
    onComparisonSelect,
    onAddComparison,
    onRemoveComparison,
    yearRange,
    selectedYearRange,
    onYearRangeChange,
    isYearRangeLoading,
    ageGroups,
    selectedAgeGroup,
    onAgeGroupChange,
    children,
}) => {
    const { formatMessage } = useSafeIntl();

    const hasDisplayOptions =
        (yearRange && selectedYearRange && onYearRangeChange) ||
        isYearRangeLoading ||
        (ageGroups &&
            ageGroups.length > 0 &&
            selectedAgeGroup &&
            onAgeGroupChange);

    return (
        <Box sx={styles.card}>
            <Box sx={styles.cardHeader}>
                <Typography sx={styles.cardTitle}>
                    {formatMessage(MESSAGES.scenariosTitle)}
                </Typography>
                <IconButton
                    size="small"
                    onClick={onAddComparison}
                    sx={styles.iconButton}
                >
                    <AddOutlinedIcon fontSize="medium" />
                </IconButton>
            </Box>
            <Box sx={styles.cardBody}>
                <Box sx={styles.scenarioRow}>
                    <ColorDot color={getScenarioColor(0)} size={14} />
                    <Box sx={styles.scenarioSelectWrap}>
                        <InputComponent
                            keyValue="scenario"
                            type="select"
                            labelString={formatMessage(MESSAGES.baselineLabel)}
                            value={baselineScenarioId}
                            options={scenarioOptions}
                            clearable={false}
                            onChange={onBaselineSelect}
                            withMarginTop={false}
                            wrapperSx={{ width: '100%' }}
                        />
                    </Box>
                    <IconButton
                        size="small"
                        sx={[styles.iconButton, styles.spacerButton]}
                    >
                        <RemoveOutlinedIcon fontSize="small" />
                    </IconButton>
                </Box>
                {comparisonScenarioIds.map((id, index) => {
                    const filteredOptions = comparisonOptions.filter(
                        option =>
                            option.value === id ||
                            !comparisonScenarioIds.includes(
                                option.value as number,
                            ),
                    );
                    return (
                        <Box
                            key={`comparison-${id || index}`}
                            sx={styles.scenarioRow}
                        >
                            <ColorDot
                                color={getScenarioColor(index + 1)}
                                size={14}
                            />
                            <Box sx={styles.scenarioSelectWrap}>
                                <InputComponent
                                    keyValue={`compare_${index}`}
                                    type="select"
                                    labelString={formatMessage(
                                        MESSAGES.scenarioLabelWithIndex,
                                        { index: index + 1 },
                                    )}
                                    value={id}
                                    options={filteredOptions}
                                    clearable={false}
                                    onChange={onComparisonSelect(index)}
                                    withMarginTop={false}
                                    wrapperSx={{ width: '100%' }}
                                />
                            </Box>
                            <IconButton
                                size="small"
                                onClick={() => onRemoveComparison(index)}
                                sx={[styles.iconButton, styles.removeButton]}
                            >
                                <RemoveOutlinedIcon fontSize="medium" />
                            </IconButton>
                        </Box>
                    );
                })}
                {hasDisplayOptions && (
                    <Box sx={styles.section}>
                        <Typography sx={styles.sectionTitle}>
                            {formatMessage(MESSAGES.displayOptionsTitle)}
                        </Typography>
                        {isYearRangeLoading && (
                            <Box sx={styles.loadingCenter}>
                                <LoadingSpinner />
                            </Box>
                        )}
                        {!isYearRangeLoading &&
                            yearRange &&
                            onYearRangeChange && (
                                <YearRangeSlider
                                    yearRange={yearRange}
                                    value={selectedYearRange ?? yearRange}
                                    onChange={onYearRangeChange}
                                />
                            )}
                        {ageGroups &&
                            ageGroups.length > 0 &&
                            selectedAgeGroup &&
                            onAgeGroupChange && (
                                <Box>
                                    <Typography
                                        variant="caption"
                                        sx={styles.subLabel}
                                    >
                                        {formatMessage(MESSAGES.ageGroupLabel)}
                                    </Typography>
                                    <InputComponent
                                        keyValue="age_group"
                                        type="select"
                                        value={selectedAgeGroup}
                                        options={ageGroups.map(ag => ({
                                            label: ag,
                                            value: ag,
                                        }))}
                                        clearable={false}
                                        onChange={onAgeGroupChange}
                                        withMarginTop={false}
                                    />
                                </Box>
                            )}
                    </Box>
                )}
                {children}
            </Box>
        </Box>
    );
};
