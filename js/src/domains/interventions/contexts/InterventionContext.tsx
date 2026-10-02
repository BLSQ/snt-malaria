import React, { createContext, useContext, useMemo } from 'react';
import { DropdownOptions } from 'Iaso/types/utils';
import { BudgetSettings } from '../../../hooks/useGetBudgetSettings';
import { MetricType } from '../../dataLayers/types/metrics';

type InterventionContextType = {
    costCategoryOptions: DropdownOptions<string>[];
    costUnitTypeOptions: DropdownOptions<string>[];
    populationOptions: DropdownOptions<number | null>[];
    grantOptions: DropdownOptions<number>[];
    currency?: string;
};

const defaultCurrency = 'USD';

const emptyPopulationOption: DropdownOptions<number | null> = {
    label: '-',
    value: null,
};

const noGrantOptions: DropdownOptions<number>[] = [];

const InterventionContext = createContext<InterventionContextType>({
    costCategoryOptions: [],
    costUnitTypeOptions: [],
    populationOptions: [emptyPopulationOption],
    grantOptions: [],
    currency: defaultCurrency,
});

export const useInterventionContext = () => useContext(InterventionContext);

export const InterventionProvider = ({
    costCategoryOptions,
    costUnitTypeOptions,
    grantOptions = noGrantOptions,
    metricTypes,
    budgetSettings,
    children,
}: {
    costCategoryOptions: DropdownOptions<string>[];
    costUnitTypeOptions: DropdownOptions<string>[];
    grantOptions?: DropdownOptions<number>[];
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
            grantOptions,
            currency,
        }),
        [
            costCategoryOptions,
            costUnitTypeOptions,
            populationOptions,
            grantOptions,
            currency,
        ],
    );

    return (
        <InterventionContext.Provider value={value}>
            {children}
        </InterventionContext.Provider>
    );
};
