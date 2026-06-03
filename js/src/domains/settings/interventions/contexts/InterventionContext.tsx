import React, { createContext, useContext } from 'react';
import { DropdownOptions } from 'Iaso/types/utils';
import { MetricType } from '../../../dataLayers/types/metrics';
import { BudgetSettings } from '../types/budgetSettings';

type InterventionContextType = {
    costCategoryOptions: DropdownOptions<string>[];
    costUnitTypeOptions: DropdownOptions<string>[];
    populationOptions: DropdownOptions<number | null>[];
    currency?: string;
    currencySymbol?: string;
};

const defaultCurrency = 'USD';

const currencySymbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
};

const emptyPopulationOptions: DropdownOptions<number | null>[] = [
    { label: '-', value: null },
];

const InterventionContext = createContext<InterventionContextType>({
    costCategoryOptions: [],
    costUnitTypeOptions: [],
    populationOptions: emptyPopulationOptions,
    currency: defaultCurrency,
    currencySymbol: currencySymbols[defaultCurrency],
});

export const useInterventionContext = () => useContext(InterventionContext);

export const InterventionProvider = ({
    costCategoryOptions,
    costUnitTypeOptions,
    metricTypes,
    budgetSettings,
    children,
}: {
    costCategoryOptions: DropdownOptions<string>[];
    costUnitTypeOptions: DropdownOptions<string>[];
    metricTypes: MetricType[];
    budgetSettings?: BudgetSettings;
    children: React.ReactNode;
}) => {
    const populationOptions: DropdownOptions<number | null>[] = metricTypes
        .filter(metric => metric.metric_kind === 'population')
        .map(metric => ({
            label: metric.name,
            value: metric.id,
        }));

    populationOptions.unshift({ label: '-', value: null });

    const currency = budgetSettings?.currency || defaultCurrency;

    return (
        <InterventionContext.Provider
            value={{
                costCategoryOptions,
                costUnitTypeOptions,
                populationOptions,
                currency,
                currencySymbol: currencySymbols[currency] || `${currency} `,
            }}
        >
            {children}
        </InterventionContext.Provider>
    );
};
