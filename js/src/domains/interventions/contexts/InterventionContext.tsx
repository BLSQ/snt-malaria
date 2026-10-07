import React, { createContext, useContext, useMemo } from 'react';
import { DropdownOptions } from 'Iaso/types/utils';
import { BudgetSettings } from '../../../hooks/useGetBudgetSettings';
import { MetricType } from '../../dataLayers/types/metrics';
import {
    bufferMultiplierToPercent,
    DEFAULT_BUFFER_MULTIPLIER,
} from '../../planning/libs/cost-utils';

type InterventionContextType = {
    costCategoryOptions: DropdownOptions<string>[];
    costUnitTypeOptions: DropdownOptions<string>[];
    populationOptions: DropdownOptions<number | null>[];
    currency?: string;
    defaultBufferPercent: number;
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
    defaultBufferPercent: bufferMultiplierToPercent(DEFAULT_BUFFER_MULTIPLIER),
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
    const defaultBufferPercent = bufferMultiplierToPercent(
        Number(budgetSettings?.buffer ?? DEFAULT_BUFFER_MULTIPLIER),
    );

    const value = useMemo(
        () => ({
            costCategoryOptions,
            costUnitTypeOptions,
            populationOptions,
            currency,
            defaultBufferPercent,
        }),
        [
            costCategoryOptions,
            costUnitTypeOptions,
            populationOptions,
            currency,
            defaultBufferPercent,
        ],
    );

    return (
        <InterventionContext.Provider value={value}>
            {children}
        </InterventionContext.Provider>
    );
};
