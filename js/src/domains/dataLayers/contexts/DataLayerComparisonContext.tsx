import React, {
    createContext,
    useCallback,
    useContext,
    useState,
} from 'react';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { MetricType } from '../types/metrics';

const MAX_METRICS = 4;

type DataLayerComparisonContextType = {
    maxMetricsCountReached: boolean;
    comparisonMetricTypes: MetricType[];
    addMetricToComparison: (metricType: MetricType) => void;
    // We need the index here as we can have multiple time the same metric on state.
    removeMetricFromComparison: (metricType: number, index: number) => void;
    orgUnits: OrgUnit[];
};

const DataLayerComparisonContext =
    createContext<DataLayerComparisonContextType>({
        maxMetricsCountReached: false,
        comparisonMetricTypes: [],
        orgUnits: [],
        addMetricToComparison: () => {},
        removeMetricFromComparison: () => {},
    });

export const useDataLayerComparisonContext = () =>
    useContext(DataLayerComparisonContext);

export const DataLayerComparisonProvider = ({
    orgUnits,
    children,
}: {
    orgUnits: OrgUnit[];
    children: React.ReactNode;
}) => {
    const [comparisonMetricTypes, setComparisonMetricTypes] = useState<
        MetricType[]
    >([]);

    const maxMetricsCountReached = comparisonMetricTypes.length >= MAX_METRICS;
    const addMetricToComparison = useCallback(
        (metricType: MetricType) => {
            if (maxMetricsCountReached) return;

            setComparisonMetricTypes([...comparisonMetricTypes, metricType]);
        },
        [comparisonMetricTypes, maxMetricsCountReached],
    );

    const removeMetricFromComparison = useCallback(
        (metricType: number, index: number) => {
            if (comparisonMetricTypes?.[index].id !== metricType) return;

            const newValue = [...comparisonMetricTypes];
            newValue.splice(index, 1);
            setComparisonMetricTypes(newValue);
        },
        [comparisonMetricTypes],
    );

    return (
        <DataLayerComparisonContext.Provider
            value={{
                maxMetricsCountReached,
                addMetricToComparison,
                removeMetricFromComparison,
                orgUnits,
                comparisonMetricTypes,
            }}
        >
            {children}
        </DataLayerComparisonContext.Provider>
    );
};
