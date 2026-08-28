import React, {
    createContext,
    FC,
    ReactNode,
    useContext,
    useMemo,
} from 'react';
import { ComparisonSlot } from '../components/comparisonTab/types';
import { Budget } from '../types/budget';
import { YearlyCost } from '../types/comparisonAggregation';

type ScenarioComparisonContextType = {
    slots: ComparisonSlot[];
    budgetsBySlotKey: Map<string, Budget | undefined>;
    // Per-slot total-cost-by-year series -- the cost-over-time chart needs the
    // whole series, not just the slot's selected year, but not the full
    // `Budget` objects either.
    totalCostsBySlotKey: Map<string, YearlyCost[]>;
    isBudgetLoading: boolean;
    currency: string;
    // The header's org-unit selector, narrowed to the intervention org-unit
    // type (see `PlanningContext.orgUnits`) -- threaded into the per-slot
    // aggregation helpers so this tab respects the same selection every
    // other tab does, instead of always aggregating the whole country.
    orgUnitIds: Set<number>;
    // Shared "total" denominators, fetched once for the whole tab rather
    // than per widget: total number of intervention-level org units
    // (districts) in the selection, and total population (with the year it
    // was resolved for -- see `usePopulationByOrgUnit`).
    totalDistrictCount?: number;
    totalPopulation?: number;
    populationYear?: number | null;
};

const ScenarioComparisonContext = createContext<ScenarioComparisonContextType>({
    slots: [],
    budgetsBySlotKey: new Map(),
    totalCostsBySlotKey: new Map(),
    isBudgetLoading: false,
    currency: '',
    orgUnitIds: new Set(),
});

export const useScenarioComparisonContext = () =>
    useContext(ScenarioComparisonContext);

export const ScenarioComparisonProvider: FC<
    ScenarioComparisonContextType & { children: ReactNode }
> = ({
    children,
    slots,
    budgetsBySlotKey,
    totalCostsBySlotKey,
    isBudgetLoading,
    currency,
    orgUnitIds,
    totalDistrictCount,
    totalPopulation,
    populationYear,
}) => {
    // Without this, every render of `ScenarioComparisonTab` (e.g. changing
    // one slot's year) rebuilds this object, forcing
    // every widget to re-render even though most of these fields (`slots`,
    // `budgetsBySlotKey`, `totalPopulation`) are already independently
    // memoized upstream and haven't actually changed.
    const value = useMemo(
        () => ({
            slots,
            budgetsBySlotKey,
            totalCostsBySlotKey,
            isBudgetLoading,
            currency,
            orgUnitIds,
            totalDistrictCount,
            totalPopulation,
            populationYear,
        }),
        [
            slots,
            budgetsBySlotKey,
            totalCostsBySlotKey,
            isBudgetLoading,
            currency,
            orgUnitIds,
            totalDistrictCount,
            totalPopulation,
            populationYear,
        ],
    );

    return (
        <ScenarioComparisonContext.Provider value={value}>
            {children}
        </ScenarioComparisonContext.Provider>
    );
};
