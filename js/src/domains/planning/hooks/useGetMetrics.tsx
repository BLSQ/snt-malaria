import { UseQueryResult } from 'react-query';
import { Form } from 'Iaso/domains/forms/types/forms';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { MetricType, MetricValue } from '../types/metrics';

export type DropdownOptions<T> = {
    label: string;
    value: T;
    original: Form;
};

export const useGetMetricTypes = (): UseQueryResult<MetricType[], Error> => {
    return useSnackQuery({
        queryKey: ['metricTypes'],
        queryFn: () => getRequest('/api/metrictypes/'),
        options: {
            staleTime: 1000 * 60 * 15, // in MS
            cacheTime: 1000 * 60 * 5,
            select: (data: MetricType[]) => {
                return Object.groupBy(data, ({ category }) => category);
            },
        },
    });
};

interface MetricValuesParams {
    metricTypeId?: number | null;
    orgUnitId?: number | null;
}

export const useGetMetricValues = ({
    metricTypeId,
    orgUnitId,
}: MetricValuesParams): UseQueryResult<MetricValue[], Error> => {
    let url = '/api/metricvalues/?';
    if (metricTypeId) {
        url += `metric_type_id=${metricTypeId}`;
    }
    if (orgUnitId) {
        url += `org_unit_id=${orgUnitId}`;
    }

    return useSnackQuery({
        queryKey: ['metricValues', metricTypeId, orgUnitId],
        queryFn: () => getRequest(url),
        options: {
            staleTime: 1000 * 60 * 15, // in MS
            cacheTime: 1000 * 60 * 5,
            enabled: Boolean(metricTypeId) || Boolean(orgUnitId),
        },
    });
};
