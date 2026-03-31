import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Grid } from '@mui/material';
import { LoadingSpinner, useSafeIntl } from 'bluesquare-components';
import TopBar from 'Iaso/components/nav/TopBarComponent';
import { SxStyles } from 'Iaso/types/general';
import {
    MainColumn,
    PageContainer,
    PaperContainer,
    PaperFullHeight,
    SidebarColumn,
    SidebarLayout,
} from '../../components/styledComponents';
import { MESSAGES } from '../messages';
import { useGetScenarios } from '../scenarios/hooks/useGetScenarios';
import { ComparisonDataProvider } from './ComparisonDataContext';
import { ComparisonCharts } from './components/ComparisonCharts';
import { InterventionMaps } from './components/InterventionMaps';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { MetricsSummary } from './components/MetricsSummary';
import { useComparisonData } from './hooks/useComparisonData';
import { useGetImpactAgeGroups } from './hooks/useGetImpactAgeGroups';
import { useGetImpactYearRange } from './hooks/useGetImpactYearRange';
import { useScenarioInterventions } from './hooks/useScenarioInterventions';
import { useScenarioSelections } from './hooks/useScenarioSelections';
import { ScenarioDisplay, toNumericId } from './types';
import { getScenarioColor } from './utils/colors';
import { intersectYearRanges } from './utils/yearRange';

const styles = {
    pageContainer: {
        overflow: 'hidden',
    },
    leftColumn: {
        height: '100%',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        '&::-webkit-scrollbar': {
            width: 0,
            height: 0,
        },
    },
    rightColumn: {
        height: '100%',
        overflowY: 'auto',
    },
} satisfies SxStyles;

export const CompareCustomize: FC = () => {
    const { formatMessage } = useSafeIntl();
    const { data: scenarios, isLoading } = useGetScenarios();
    const {
        baselineScenarioId,
        comparisonScenarioIds,
        scenarioOptions,
        comparisonOptions,
        handleBaselineSelect,
        handleComparisonSelect,
        handleAddComparison,
        handleRemoveComparison,
    } = useScenarioSelections(scenarios);

    const {
        selectedInterventionId,
        interventionOptions,
        hasInterventions,
        handleInterventionSelect,
    } = useScenarioInterventions({
        baselineScenarioId,
        comparisonScenarioIds,
    });

    const displayScenarios: ScenarioDisplay[] = useMemo(() => {
        const scenarioMap = new Map(
            scenarioOptions.map(option => [option.value, option.label]),
        );
        const ids = [baselineScenarioId, ...comparisonScenarioIds]
            .map(toNumericId)
            .filter((id): id is number => id !== undefined);
        return ids.map((id, index) => ({
            id,
            label:
                scenarioMap.get(id) ??
                formatMessage(MESSAGES.scenarioFallbackLabel, { value: id }),
            color: getScenarioColor(index),
        }));
    }, [
        baselineScenarioId,
        comparisonScenarioIds,
        scenarioOptions,
        formatMessage,
    ]);

    // Year range state
    const yearRangeQuery = useGetImpactYearRange();
    const [selectedYearRange, setSelectedYearRange] = useState<
        [number, number] | undefined
    >(undefined);

    const scenariosYearRange = useMemo((): [number, number] | undefined => {
        if (!scenarios?.length) return undefined;
        const ids = [baselineScenarioId, ...comparisonScenarioIds]
            .map(toNumericId)
            .filter((id): id is number => id !== undefined);
        if (ids.length === 0) return undefined;
        const selected = ids
            .map(id => scenarios.find(s => s.id === id))
            .filter((s): s is NonNullable<typeof s> => s != null);
        if (selected.length === 0) return undefined;
        const maxStart = Math.max(...selected.map(s => s.start_year));
        const minEnd = Math.min(...selected.map(s => s.end_year));
        if (maxStart > minEnd) return undefined;
        return [maxStart, minEnd];
    }, [scenarios, baselineScenarioId, comparisonScenarioIds]);

    const impactYearRange = useMemo((): [number, number] | undefined => {
        if (!yearRangeQuery.data) return undefined;
        return [yearRangeQuery.data.min_year, yearRangeQuery.data.max_year];
    }, [yearRangeQuery.data]);

    const effectiveYearRange = useMemo((): [number, number] | undefined => {
        if (!scenariosYearRange || !impactYearRange) return undefined;
        return intersectYearRanges(scenariosYearRange, impactYearRange);
    }, [scenariosYearRange, impactYearRange]);

    useEffect(() => {
        if (!effectiveYearRange) return;
        setSelectedYearRange(prev => {
            if (
                prev &&
                prev[0] === effectiveYearRange[0] &&
                prev[1] === effectiveYearRange[1]
            ) {
                return prev;
            }
            return effectiveYearRange;
        });
    }, [effectiveYearRange]);

    const yearFrom = effectiveYearRange
        ? (selectedYearRange?.[0] ?? effectiveYearRange[0])
        : undefined;
    const yearTo = effectiveYearRange
        ? (selectedYearRange?.[1] ?? effectiveYearRange[1])
        : undefined;

    // Age group state
    const ageGroupsQuery = useGetImpactAgeGroups();
    const [selectedAgeGroup, setSelectedAgeGroup] = useState<
        string | undefined
    >(undefined);

    useEffect(() => {
        if (
            ageGroupsQuery.data &&
            ageGroupsQuery.data.age_groups.length > 0 &&
            selectedAgeGroup === undefined
        ) {
            setSelectedAgeGroup(ageGroupsQuery.data.age_groups[0]);
        }
    }, [ageGroupsQuery.data, selectedAgeGroup]);

    const handleAgeGroupChange = useCallback(
        (_key: string, value: unknown) => {
            setSelectedAgeGroup(value as string | undefined);
        },
        [setSelectedAgeGroup],
    );

    const {
        baselineScenarioNumericId,
        budgetsByScenarioId,
        impactsByScenarioId,
        isBudgetLoading,
        isImpactLoading,
    } = useComparisonData({
        baselineScenarioId,
        comparisonScenarioIds,
        yearFrom,
        yearTo,
        selectedAgeGroup,
    });

    return (
        <>
            {isLoading && <LoadingSpinner />}
            <TopBar
                title={formatMessage(MESSAGES.compareCustomizeTitle)}
                disableShadow
            />
            <ComparisonDataProvider
                scenarios={displayScenarios}
                baselineScenarioId={baselineScenarioNumericId}
                impactsByScenarioId={impactsByScenarioId}
                budgetsByScenarioId={budgetsByScenarioId}
                isImpactLoading={isImpactLoading}
                isBudgetLoading={isBudgetLoading}
                targetYear={yearTo}
                yearFrom={yearFrom}
            >
            <PageContainer sx={styles.pageContainer}>
                <SidebarLayout>
                    <MainColumn>
                        <PaperContainer sx={{ height: '100%' }}>
                            <Box sx={styles.leftColumn}>
                                <Grid container spacing={1}>
                                    <Grid item xs={12}>
                                        <InterventionMaps
                                            selectedInterventionId={
                                                selectedInterventionId
                                            }
                                            interventionOptions={
                                                interventionOptions
                                            }
                                            hasInterventions={hasInterventions}
                                            onInterventionSelect={
                                                handleInterventionSelect
                                            }
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <MetricsSummary />
                                    </Grid>
                                    <ComparisonCharts />
                                </Grid>
                            </Box>
                        </PaperContainer>
                    </MainColumn>
                    <SidebarColumn>
                        <PaperFullHeight sx={styles.rightColumn}>
                            <ConfigurationPanel
                                baselineScenarioId={baselineScenarioId}
                                comparisonScenarioIds={comparisonScenarioIds}
                                scenarioOptions={scenarioOptions}
                                comparisonOptions={comparisonOptions}
                                onBaselineSelect={handleBaselineSelect}
                                onComparisonSelect={handleComparisonSelect}
                                onAddComparison={handleAddComparison}
                                onRemoveComparison={handleRemoveComparison}
                                yearRange={effectiveYearRange}
                                selectedYearRange={selectedYearRange}
                                onYearRangeChange={setSelectedYearRange}
                                showYearRangeError={
                                    displayScenarios.length > 0 &&
                                    !effectiveYearRange
                                }
                                isYearRangeLoading={
                                    displayScenarios.length > 0 &&
                                    (isLoading ||
                                        yearRangeQuery.isLoading ||
                                        yearRangeQuery.isFetching)
                                }
                                ageGroups={ageGroupsQuery.data?.age_groups}
                                selectedAgeGroup={selectedAgeGroup}
                                onAgeGroupChange={handleAgeGroupChange}
                            />
                        </PaperFullHeight>
                    </SidebarColumn>
                </SidebarLayout>
            </PageContainer>
            </ComparisonDataProvider>
        </>
    );
};
