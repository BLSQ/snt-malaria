import React, { FC, useCallback, useMemo, useState } from 'react';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import RemoveOutlinedIcon from '@mui/icons-material/RemoveOutlined';
import {
    Alert,
    AlertTitle,
    Box,
    Button,
    Chip,
    IconButton,
    Theme,
    Typography,
} from '@mui/material';
import { blueGrey } from '@mui/material/colors';
import { alpha } from '@mui/material/styles';
import { LoadingSpinner, useSafeIntl } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { YearRangeSlider } from '../../../components/YearRangeSlider';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../messages';
import {
    ImpactProviderMeta,
    ScenarioId,
    ScenarioMatchWarning,
    ScenarioOption,
} from '../types';
import { getScenarioColor } from '../utils/colors';
import { Card } from './Card';

type Props = {
    baselineScenarioId: ScenarioId;
    comparisonScenarioIds: ScenarioId[];
    scenarioOptions: ScenarioOption[];
    comparisonOptions: ScenarioOption[];
    onBaselineSelect: (_key: string, value: unknown) => void;
    onComparisonSelect: (index: number) => (_key: string, value: unknown) => void;
    onAddComparison: () => void;
    onRemoveComparison: (index: number) => void;
    yearRange?: [number, number];
    selectedYearRange?: [number, number];
    onYearRangeChange?: (range: [number, number]) => void;
    showYearRangeError?: boolean;
    isYearRangeLoading?: boolean;
    ageGroups?: string[];
    selectedAgeGroup?: string;
    onAgeGroupChange?: (_key: string, value: unknown) => void;
    orgUnitsNotFound?: ScenarioMatchWarning[];
    orgUnitsWithUnmatchedInterventions?: ScenarioMatchWarning[];
    providerMeta?: ImpactProviderMeta;
};

const styles = {
    scenarioRow: {
        display: 'grid',
        alignItems: 'center',
        gridTemplateColumns: theme =>
            `max-content 1fr ${theme.spacing(4)}`,
        columnGap: 2,
        mt: 2,
    },
    scenarioSelectWrap: {
        minWidth: 0,
        '& .MuiInputLabel-shrink': {
            backgroundColor: 'transparent !important',
        },
    },
    scenarioDot: {
        width: theme => theme.spacing(1.75),
        height: theme => theme.spacing(1.75),
        borderRadius: '50%',
        flex: '0 0 auto',
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
    chipContainer: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 0.5,
        mt: 1,
    },
    cardBackground: {
        backgroundColor: (theme: Theme) =>
            alpha(theme.palette.common.white, 0.5),
    },
    loadingCenter: {
        display: 'flex',
        justifyContent: 'center',
    },
    warningTitleRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardBody: {
        display: 'flex',
        flexDirection: 'column',
    },
    alertsSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        mt: 2,
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        '&::-webkit-scrollbar': {
            width: 0,
            height: 0,
        },
    },
    detailsButton: {
        p: 0,
        textTransform: 'none',
        minWidth: 0,
    },
    alertBox: {
        borderRadius: 3,
        border: 'none',
    },
    alertBoxWarning: {
        backgroundColor: (theme: Theme) =>
            alpha(theme.palette.warning.light, 0.15),
        '& .MuiAlert-icon': { color: 'warning.main' },
    },
    alertBoxInfo: {
        backgroundColor: (theme: Theme) =>
            alpha(theme.palette.info.light, 0.15),
        '& .MuiAlert-icon': { color: 'info.main' },
    },
    scenarioChip: {
        color: (theme: Theme) => theme.palette.common.white,
        fontWeight: 500,
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
    showYearRangeError,
    isYearRangeLoading,
    ageGroups,
    selectedAgeGroup,
    onAgeGroupChange,
    orgUnitsNotFound,
    orgUnitsWithUnmatchedInterventions,
    providerMeta,
}) => {
    const { formatMessage } = useSafeIntl();

    const hasDisplayOptions =
        (yearRange && selectedYearRange && onYearRangeChange) ||
        isYearRangeLoading ||
        (ageGroups && ageGroups.length > 0 && selectedAgeGroup && onAgeGroupChange);

    const hasWarnings =
        showYearRangeError ||
        (orgUnitsNotFound?.length ?? 0) > 0 ||
        (orgUnitsWithUnmatchedInterventions?.length ?? 0) > 0;
    const isFakeProvider = providerMeta?.provider_key === 'fake';

    const [showNotFoundDetails, setShowNotFoundDetails] = useState(false);
    const [showUnmatchedDetails, setShowUnmatchedDetails] = useState(false);

    return (
        <Card
            title={formatMessage(MESSAGES.scenariosTitle)}
            actions={
                <IconButton
                    size="small"
                    onClick={onAddComparison}
                    sx={styles.iconButton}
                >
                    <AddOutlinedIcon fontSize="medium" />
                </IconButton>
            }
            cardSx={styles.cardBackground}
            bodySx={styles.cardBody}
        >
            <Box sx={styles.scenarioRow}>
                <Box
                    sx={[
                        styles.scenarioDot,
                        { backgroundColor: getScenarioColor(0) },
                    ]}
                />
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
                        !comparisonScenarioIds.includes(option.value as number),
                );
                return (
                    <Box key={`comparison-${id || index}`} sx={styles.scenarioRow}>
                        <Box
                            sx={[
                                styles.scenarioDot,
                                {
                                    backgroundColor: getScenarioColor(index + 1),
                                },
                            ]}
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
                    {!isYearRangeLoading && yearRange && onYearRangeChange && (
                        <YearRangeSlider
                            yearRange={yearRange}
                            value={selectedYearRange ?? yearRange}
                            onChange={onYearRangeChange}
                        />
                    )}
                    {ageGroups && ageGroups.length > 0 && selectedAgeGroup && onAgeGroupChange && (
                        <Box>
                            <Typography variant="caption" sx={styles.subLabel}>
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
            {hasWarnings && (
                <Typography sx={styles.sectionTitle}>
                    {formatMessage(MESSAGES.warningsTitle)}
                </Typography>
            )}
            <Box sx={styles.alertsSection}>
                {showYearRangeError && (
                    <Alert
                        severity="warning"
                        sx={[styles.alertBox, styles.alertBoxWarning]}
                    >
                        <AlertTitle>
                            {formatMessage(MESSAGES.noYearRangeOverlapTitle)}
                        </AlertTitle>
                        {formatMessage(MESSAGES.noYearRangeOverlap)}
                    </Alert>
                )}
                {orgUnitsNotFound && orgUnitsNotFound.length > 0 && (
                    <Alert
                        severity="warning"
                        sx={[styles.alertBox, styles.alertBoxWarning]}
                    >
                        <AlertTitle sx={styles.warningTitleRow}>
                            {formatMessage(MESSAGES.orgUnitsNotFoundTitle)}
                            <Button
                                size="small"
                                onClick={() => setShowNotFoundDetails(prev => !prev)}
                                sx={styles.detailsButton}
                            >
                                {formatMessage(showNotFoundDetails ? MESSAGES.hideDetails : MESSAGES.showDetails)}
                            </Button>
                        </AlertTitle>
                        {formatMessage(MESSAGES.orgUnitsNotFound)}
                        {showNotFoundDetails && (
                            <Box sx={styles.chipContainer}>
                                {orgUnitsNotFound.flatMap(({ scenario, orgUnits }) =>
                                    orgUnits.map(ou => (
                                        <Chip
                                            key={`${scenario.id}-${ou.org_unit_id}`}
                                            label={ou.org_unit_name}
                                            size="small"
                                            sx={[
                                                styles.scenarioChip,
                                                { backgroundColor: scenario.color },
                                            ]}
                                        />
                                    )),
                                )}
                            </Box>
                        )}
                    </Alert>
                )}
                {orgUnitsWithUnmatchedInterventions && orgUnitsWithUnmatchedInterventions.length > 0 && (
                    <Alert
                        severity="warning"
                        sx={[styles.alertBox, styles.alertBoxWarning]}
                    >
                        <AlertTitle sx={styles.warningTitleRow}>
                            {formatMessage(MESSAGES.orgUnitsWithUnmatchedInterventionsTitle)}
                            <Button
                                size="small"
                                onClick={() => setShowUnmatchedDetails(prev => !prev)}
                                sx={styles.detailsButton}
                            >
                                {formatMessage(showUnmatchedDetails ? MESSAGES.hideDetails : MESSAGES.showDetails)}
                            </Button>
                        </AlertTitle>
                        {formatMessage(MESSAGES.orgUnitsWithUnmatchedInterventions)}
                        {showUnmatchedDetails && (
                            <Box sx={styles.chipContainer}>
                                {orgUnitsWithUnmatchedInterventions.flatMap(({ scenario, orgUnits }) =>
                                    orgUnits.map(ou => (
                                        <Chip
                                            key={`${scenario.id}-${ou.org_unit_id}`}
                                            label={ou.org_unit_name}
                                            size="small"
                                            sx={[
                                                styles.scenarioChip,
                                                { backgroundColor: scenario.color },
                                            ]}
                                        />
                                    )),
                                )}
                            </Box>
                        )}
                    </Alert>
                )}
                {isFakeProvider && (
                    <Alert
                        severity="info"
                        sx={[styles.alertBox, styles.alertBoxInfo]}
                    >
                        <AlertTitle>
                            {formatMessage(MESSAGES.fakeProviderInfoTitle)}
                        </AlertTitle>
                        {formatMessage(MESSAGES.fakeProviderInfoBody)}
                    </Alert>
                )}
            </Box>
        </Card>
    );
};
