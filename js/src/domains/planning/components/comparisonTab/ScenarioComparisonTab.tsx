import React, { FC, ReactElement, ReactNode, useMemo, useState } from 'react';
import { Box, Card, CardHeader, Grid } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { PaperFullHeight } from '../../../../components/styledComponents';
import { buildMetricEntries } from '../../../compareCustomize/components/MetricCard';
import { getScenarioColor } from '../../../compareCustomize/utils/colors';
import { useGetScenarios } from '../../../scenarios/hooks/useGetScenarios';
import { usePlanningContext } from '../../contexts/PlanningContext';
import { ScenarioComparisonProvider } from '../../contexts/ScenarioComparisonContext';
import { useGetAccountSettings } from '../../hooks/useGetAccountSettings';
import { useGetOrgUnits } from '../../hooks/useGetOrgUnits';
import { usePopulationByOrgUnit } from '../../hooks/usePopulationByOrgUnit';
import { getSlotTotalCost } from '../../libs/comparison-aggregation';
import { formatBigNumber } from '../../libs/cost-utils';
import { ComparisonHeaderControls } from './ComparisonHeaderControls';
import { ScenarioSlotWidget } from './ScenarioSlotWidget';
import { ComparisonSlot, DisplayMode } from './types';
import { useComparisonSlots } from './useComparisonSlots';
import { useScenarioComparisonData } from './useScenarioComparisonData';
import { BudgetByInterventionWidget } from './widgets/BudgetByInterventionWidget';
import { CommoditiesWidget } from './widgets/CommoditiesWidget';
import { DistrictsCoveredWidget } from './widgets/DistrictsCoveredWidget';
import { PopulationCoverageWidget } from './widgets/PopulationCoverageWidget';

const CHART_HEIGHT = 360;

const styles = {
    column: {
        flex: 1,
        width: '100%',
        height: 0,
        minHeight: 0,
        maxHeight: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    },
    headerCard: {
        mb: 1,
        flexShrink: 0,
    },
    header: {
        py: 2,
        minHeight: '81px',
    },
    scrollArea: {
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
    },
    slotsRow: {
        flexShrink: 0,
    },
    // `height`, not `minHeight`: descendant WidgetCard/Grid height:100%
    // chains need a genuinely definite size to resolve against.
    widget: {
        flexShrink: 0,
        height: CHART_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
    },
} satisfies SxStyles;

type Props = {
    header: (tabActions?: ReactNode) => ReactElement;
};

export const ScenarioComparisonTab: FC<Props> = ({ header }) => {
    const { scenario, currency } = usePlanningContext();
    const { data: scenarios } = useGetScenarios();
    const { data: accountSettings } = useGetAccountSettings();
    const interventionTypeId = accountSettings?.intervention_org_unit_type_id;
    const { data: allOrgUnits } = useGetOrgUnits({
        orgUnitTypeId: interventionTypeId,
        enabled: !!interventionTypeId,
    });
    const { populationByOrgUnit, year: populationYear } =
        usePopulationByOrgUnit({
            metricTypeId: accountSettings?.default_population_id,
        });

    const totalDistrictCount = allOrgUnits?.length;
    const totalPopulation = useMemo(() => {
        if (!populationByOrgUnit || !allOrgUnits) {
            return undefined;
        }
        return allOrgUnits.reduce(
            (total, orgUnit) =>
                total + (populationByOrgUnit.get(orgUnit.id) ?? 0),
            0,
        );
    }, [populationByOrgUnit, allOrgUnits]);

    const {
        currentYear,
        extraSlots,
        optionsForSlot,
        yearOptionsFor,
        handleCurrentYearChange,
        handleAddSlot,
        handleRemoveSlot,
        handleSlotScenarioChange,
        handleSlotYearChange,
        canAddSlot,
    } = useComparisonSlots(scenario, scenarios);

    const scenarioNameById = useMemo(() => {
        const map = new Map<number, string>();
        (scenarios ?? []).forEach(s => map.set(s.id, s.name));
        return map;
    }, [scenarios]);

    const slots: ComparisonSlot[] = useMemo(() => {
        const result: ComparisonSlot[] = [];
        if (scenario) {
            result.push({
                key: 'slot-0',
                scenarioId: scenario.id,
                year: currentYear,
                label: `${scenario.name} (${currentYear})`,
                color: getScenarioColor(0),
                isCurrent: true,
            });
        }
        extraSlots.forEach((slot, index) => {
            result.push({
                key: `slot-${index + 1}`,
                scenarioId: slot.scenarioId,
                year: slot.year,
                label: `${scenarioNameById.get(slot.scenarioId) ?? ''} (${slot.year})`,
                color: getScenarioColor(index + 1),
                isCurrent: false,
            });
        });
        return result;
    }, [scenario, currentYear, extraSlots, scenarioNameById]);

    const { budgetsBySlotKey, isBudgetLoading } =
        useScenarioComparisonData(slots);

    // `slots` is briefly empty while the current scenario is still loading
    // (e.g. right after switching scenarios) -- guard against `12 / 0`.
    const slotColumnWidth = slots.length > 0 ? 12 / slots.length : 12;

    const [displayMode, setDisplayMode] = useState<DisplayMode>('sideBySide');

    const totalCostEntryBySlotKey = useMemo(() => {
        const totalCostBySlotKey = new Map<string, number | undefined>();
        slots.forEach(slot => {
            totalCostBySlotKey.set(
                slot.key,
                getSlotTotalCost(budgetsBySlotKey.get(slot.key)),
            );
        });
        const entries = buildMetricEntries(
            slots.map(slot => ({ id: slot.key, color: slot.color })),
            totalCostBySlotKey,
            value => value,
            (value: number) => formatBigNumber(value, currency),
            { relative: true, positiveIsGreen: false },
        );
        return new Map(entries.map(entry => [entry.id, entry]));
    }, [slots, budgetsBySlotKey, currency]);

    return (
        <PaperFullHeight sx={styles.column}>
            <Card sx={styles.headerCard}>
                <CardHeader
                    sx={styles.header}
                    title={header(
                        <ComparisonHeaderControls
                            canAddSlot={canAddSlot}
                            onAddSlot={handleAddSlot}
                            displayMode={displayMode}
                            onDisplayModeChange={setDisplayMode}
                        />,
                    )}
                />
            </Card>
            <Box sx={styles.scrollArea}>
                <ScenarioComparisonProvider
                    slots={slots}
                    budgetsBySlotKey={budgetsBySlotKey}
                    isBudgetLoading={isBudgetLoading}
                    currency={currency}
                    displayMode={displayMode}
                    totalDistrictCount={totalDistrictCount}
                    totalPopulation={totalPopulation}
                    populationYear={populationYear}
                >
                    <Grid container spacing={1} sx={styles.slotsRow}>
                        <Grid item xs={12} md={slotColumnWidth}>
                            <ScenarioSlotWidget
                                color={getScenarioColor(0)}
                                isCurrent
                                currentScenarioLabel={scenario?.name ?? ''}
                                year={currentYear}
                                yearOptions={yearOptionsFor(scenario?.id)}
                                onYearChange={handleCurrentYearChange}
                                metricEntry={totalCostEntryBySlotKey.get(
                                    'slot-0',
                                )}
                            />
                        </Grid>
                        {React.Children.toArray(
                            extraSlots.map((slot, index) => (
                                <Grid item xs={12} md={slotColumnWidth}>
                                    <ScenarioSlotWidget
                                        color={getScenarioColor(index + 1)}
                                        isCurrent={false}
                                        scenarioValue={slot.scenarioId}
                                        scenarioOptions={optionsForSlot(index)}
                                        onScenarioChange={handleSlotScenarioChange(
                                            index,
                                        )}
                                        slotNumber={index + 1}
                                        year={slot.year}
                                        yearOptions={yearOptionsFor(
                                            slot.scenarioId,
                                        )}
                                        onYearChange={handleSlotYearChange(
                                            index,
                                        )}
                                        onRemove={() => handleRemoveSlot(index)}
                                        metricEntry={totalCostEntryBySlotKey.get(
                                            `slot-${index + 1}`,
                                        )}
                                    />
                                </Grid>
                            )),
                        )}
                    </Grid>
                    <Box sx={styles.widget}>
                        <BudgetByInterventionWidget />
                    </Box>
                    <Box sx={styles.widget}>
                        <PopulationCoverageWidget />
                    </Box>
                    <Box sx={styles.widget}>
                        <DistrictsCoveredWidget />
                    </Box>
                    <Box sx={styles.widget}>
                        <CommoditiesWidget />
                    </Box>
                </ScenarioComparisonProvider>
            </Box>
        </PaperFullHeight>
    );
};
