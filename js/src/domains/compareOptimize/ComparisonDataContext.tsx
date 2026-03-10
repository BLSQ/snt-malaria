import React, { createContext, FC, ReactNode, useContext } from 'react';
import { BudgetCalculationResponse } from '../planning/types/budget';
import { ScenarioImpactMetrics, ScenarioDisplay } from './types';

type ComparisonData = {
    scenarios: ScenarioDisplay[];
    baselineScenarioId: number | undefined;
    impactsByScenarioId: Map<number, ScenarioImpactMetrics | undefined>;
    budgetsByScenarioId: Map<number, BudgetCalculationResponse | undefined>;
    isImpactLoading: boolean;
    isBudgetLoading: boolean;
    targetYear?: number;
    yearFrom?: number;
};

const ComparisonDataContext = createContext<ComparisonData | undefined>(
    undefined,
);

export const ComparisonDataProvider: FC<
    ComparisonData & { children: ReactNode }
> = ({ children, ...value }) => (
    <ComparisonDataContext.Provider value={value}>
        {children}
    </ComparisonDataContext.Provider>
);

export const useComparisonDataContext = (): ComparisonData => {
    const ctx = useContext(ComparisonDataContext);
    if (!ctx) {
        throw new Error(
            'useComparisonDataContext must be used inside <ComparisonDataProvider>',
        );
    }
    return ctx;
};
