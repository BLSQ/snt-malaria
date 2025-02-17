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
        },
    });
};

export const useGetMetricValues = (
    metricTypeId: number | null,
): UseQueryResult<MetricValue[], Error> => {
    const url = `/api/metricvalues/?metric_type_id=${metricTypeId}`;

    return useSnackQuery({
        queryKey: ['metricValues', metricTypeId],
        queryFn: () => getRequest(url),
        options: {
            staleTime: 1000 * 60 * 15, // in MS
            cacheTime: 1000 * 60 * 5,
            enabled: Boolean(metricTypeId),
            // select: data =>
            //     data?.forms?.map(t => ({
            //         label: t.name,
            //         value: t.id,
            //         original: t,
            //     })) || [],
        },
    });
};
