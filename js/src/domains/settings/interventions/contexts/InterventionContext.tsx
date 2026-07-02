import React, { createContext, useContext, useMemo } from 'react';
import { DropdownOptions } from 'Iaso/types/utils';
import { MetricType } from '../../../dataLayers/types/metrics';
import {
    indexCostUnitTypeOptions,
    InterventionCostUnitTypeOption,
} from '../../../interventions/hooks/useGetInterventionCostUnitType';
import { BudgetSettings } from '../types/budgetSettings';

type InterventionContextType = {
    costCategoryOptions: DropdownOptions<string>[];
    costUnitTypeOptions: InterventionCostUnitTypeOption[];
    costUnitTypesById: Record<string, InterventionCostUnitTypeOption>;
    populationOptions: DropdownOptions<number | null>[];
    grantOptions: DropdownOptions<number>[];
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
    costUnitTypesById: {},
    populationOptions: emptyPopulationOptions,
    grantOptions: [],
    currency: defaultCurrency,
    currencySymbol: currencySymbols[defaultCurrency],
});

export const useInterventionContext = () => useContext(InterventionContext);

export const InterventionProvider = ({
    costCategoryOptions,
    costUnitTypeOptions,
    grantOptions,
    metricTypes,
    budgetSettings,
    children,
}: {
    costCategoryOptions: DropdownOptions<string>[];
    costUnitTypeOptions: InterventionCostUnitTypeOption[];
    grantOptions: DropdownOptions<number>[];
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

    const costUnitTypesById = useMemo(
        () => indexCostUnitTypeOptions(costUnitTypeOptions),
        [costUnitTypeOptions],
    );

    const currency = budgetSettings?.currency || defaultCurrency;

    return (
        <InterventionContext.Provider
            value={{
                costCategoryOptions,
                costUnitTypeOptions,
                costUnitTypesById,
                populationOptions,
                grantOptions,
                currency,
                currencySymbol: currencySymbols[currency] || `${currency} `,
            }}
        >
            {children}
        </InterventionContext.Provider>
    );
};
