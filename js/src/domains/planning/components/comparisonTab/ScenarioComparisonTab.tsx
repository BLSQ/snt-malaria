import React, { FC, ReactNode, useMemo, useState } from 'react';
import { Box, Card, CardHeader, Divider } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { PaperFullHeight } from '../../../../components/styledComponents';
import { getScenarioColor } from '../../../compareCustomize/utils/colors';
import { useGetScenarios } from '../../../scenarios/hooks/useGetScenarios';
import { usePlanningContext } from '../../contexts/PlanningContext';
import { ScenarioComparisonProvider } from '../../contexts/ScenarioComparisonContext';
import { useGetAccountSettings } from '../../hooks/useGetAccountSettings';
import { useGetOrgUnits } from '../../hooks/useGetOrgUnits';
import { usePopulationByOrgUnit } from '../../hooks/usePopulationByOrgUnit';
import { DisplayModeToggle } from './DisplayModeToggle';
import { SlotSelector } from './SlotSelector';
import { TotalCostSummary } from './TotalCostSummary';
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
    controlsCard: {
        py: 1.75,
        px: 2.5,
        flexShrink: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 3,
        flexWrap: 'wrap',
    },
    controlsDivider: {
        alignSelf: 'stretch',
        my: -1.75,
    },
    controlsRight: {
        display: 'flex',
        alignItems: 'center',
        gap: 3,
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
    header: ReactNode;
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

    const [displayMode, setDisplayMode] = useState<DisplayMode>('sideBySide');

    return (
        <PaperFullHeight sx={styles.column}>
            <Card sx={styles.headerCard}>
                <CardHeader sx={styles.header} title={header} />
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
                    <Card sx={styles.controlsCard}>
                        <SlotSelector
                            slots={extraSlots}
                            currentScenarioLabel={scenario?.name ?? ''}
                            currentYear={currentYear}
                            currentYearOptions={yearOptionsFor(scenario?.id)}
                            scenarioOptionsForSlot={optionsForSlot}
                            yearOptionsFor={yearOptionsFor}
                            onCurrentYearChange={handleCurrentYearChange}
                            onSlotScenarioChange={handleSlotScenarioChange}
                            onSlotYearChange={handleSlotYearChange}
                            onAddSlot={handleAddSlot}
                            onRemoveSlot={handleRemoveSlot}
                            canAddSlot={canAddSlot}
                            colorForIndex={getScenarioColor}
                        />
                        <Box sx={styles.controlsRight}>
                            <Divider
                                orientation="vertical"
                                sx={styles.controlsDivider}
                            />
                            <DisplayModeToggle
                                displayMode={displayMode}
                                onChange={setDisplayMode}
                            />
                            <Divider
                                orientation="vertical"
                                sx={styles.controlsDivider}
                            />
                            <TotalCostSummary />
                        </Box>
                    </Card>
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
