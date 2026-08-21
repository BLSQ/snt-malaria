import React, {
    createContext,
    FC,
    ReactNode,
    useContext,
    useMemo,
} from 'react';
import { ComparisonSlot, DisplayMode } from '../components/comparisonTab/types';
import { Budget } from '../types/budget';

type ScenarioComparisonContextType = {
    slots: ComparisonSlot[];
    budgetsBySlotKey: Map<string, Budget | undefined>;
    isBudgetLoading: boolean;
    currency: string;
    displayMode: DisplayMode;
    // Shared "total" denominators, fetched once for the whole tab rather
    // than per widget: total number of intervention-level org units
    // (districts) in the country, and total population (with the year it
    // was resolved for -- see `usePopulationByOrgUnit`).
    totalDistrictCount?: number;
    totalPopulation?: number;
    populationYear?: number | null;
};

const ScenarioComparisonContext = createContext<ScenarioComparisonContextType>({
    slots: [],
    budgetsBySlotKey: new Map(),
    isBudgetLoading: false,
    currency: '',
    displayMode: 'sideBySide',
});

export const useScenarioComparisonContext = () =>
    useContext(ScenarioComparisonContext);

export const ScenarioComparisonProvider: FC<
    ScenarioComparisonContextType & { children: ReactNode }
> = ({
    children,
    slots,
    budgetsBySlotKey,
    isBudgetLoading,
    currency,
    displayMode,
    totalDistrictCount,
    totalPopulation,
    populationYear,
}) => {
    // Without this, every render of `ScenarioComparisonTab` (e.g. toggling
    // `displayMode`, changing one slot's year) rebuilds this object, forcing
    // every widget to re-render even though most of these fields (`slots`,
    // `budgetsBySlotKey`, `totalPopulation`) are already independently
    // memoized upstream and haven't actually changed.
    const value = useMemo(
        () => ({
            slots,
            budgetsBySlotKey,
            isBudgetLoading,
            currency,
            displayMode,
            totalDistrictCount,
            totalPopulation,
            populationYear,
        }),
        [
            slots,
            budgetsBySlotKey,
            isBudgetLoading,
            currency,
            displayMode,
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
