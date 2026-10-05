import React, { createContext, useContext, useMemo } from 'react';
import { DropdownOptions } from 'Iaso/types/utils';
import { BudgetSettings } from '../../../hooks/useGetBudgetSettings';
import { MetricType } from '../../dataLayers/types/metrics';

type InterventionContextType = {
    costCategoryOptions: DropdownOptions<string>[];
    costUnitTypeOptions: DropdownOptions<string>[];
    populationOptions: DropdownOptions<number | null>[];
    currency?: string;
};

const defaultCurrency = 'USD';

const emptyPopulationOption: DropdownOptions<number | null> = {
    label: '-',
    value: null,
};

const InterventionContext = createContext<InterventionContextType>({
    costCategoryOptions: [],
    costUnitTypeOptions: [],
    populationOptions: [emptyPopulationOption],
    currency: defaultCurrency,
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
    const populationOptions = useMemo(
        () => [
            emptyPopulationOption,
            ...metricTypes
                .filter(metric => metric.metric_kind === 'population')
                .map(metric => ({ label: metric.name, value: metric.id })),
        ],
        [metricTypes],
    );

    const currency = budgetSettings?.local_currency || defaultCurrency;

    const value = useMemo(
        () => ({
            costCategoryOptions,
            costUnitTypeOptions,
            populationOptions,
            currency,
        }),
        [costCategoryOptions, costUnitTypeOptions, populationOptions, currency],
    );

    return (
        <InterventionContext.Provider value={value}>
            {children}
        </InterventionContext.Provider>
    );
};
