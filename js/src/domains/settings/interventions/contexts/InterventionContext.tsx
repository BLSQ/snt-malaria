import React, { createContext, useContext } from 'react';
import { DropdownOptions } from 'Iaso/types/utils';
import { BudgetSettings } from '../../../../hooks/useGetBudgetSettings';
import { MetricType } from '../../../dataLayers/types/metrics';

type InterventionContextType = {
    costCategoryOptions: DropdownOptions<string>[];
    costUnitTypeOptions: DropdownOptions<string>[];
    populationOptions: DropdownOptions<number | null>[];
    grantOptions: DropdownOptions<number>[];
    currency?: string;
};

const defaultCurrency = 'USD';

const emptyPopulationOptions: DropdownOptions<number | null>[] = [
    { label: '-', value: null },
];

const InterventionContext = createContext<InterventionContextType>({
    costCategoryOptions: [],
    costUnitTypeOptions: [],
    populationOptions: emptyPopulationOptions,
    grantOptions: [],
    currency: defaultCurrency,
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
    costUnitTypeOptions: DropdownOptions<string>[];
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

    const currency = budgetSettings?.local_currency || defaultCurrency;

    return (
        <InterventionContext.Provider
            value={{
                costCategoryOptions,
                costUnitTypeOptions,
                populationOptions,
                grantOptions,
                currency,
            }}
        >
            {children}
        </InterventionContext.Provider>
    );
};
