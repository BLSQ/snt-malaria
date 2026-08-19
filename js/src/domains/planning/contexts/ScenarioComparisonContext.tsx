import React, { createContext, FC, ReactNode, useContext } from 'react';
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

const ScenarioComparisonContext = createContext<ScenarioComparisonContextType>(
    {
        slots: [],
        budgetsBySlotKey: new Map(),
        isBudgetLoading: false,
        currency: '',
        displayMode: 'sideBySide',
    },
);

export const useScenarioComparisonContext = () =>
    useContext(ScenarioComparisonContext);

export const ScenarioComparisonProvider: FC<
    ScenarioComparisonContextType & { children: ReactNode }
> = ({ children, ...value }) => (
    <ScenarioComparisonContext.Provider value={value}>
        {children}
    </ScenarioComparisonContext.Provider>
);
