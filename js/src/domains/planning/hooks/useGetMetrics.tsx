import { useQuery, UseQueryResult } from 'react-query';
import { Form } from 'Iaso/domains/forms/types/forms';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import {
    MetricsFilters,
    MetricType,
    MetricTypeCategory,
    MetricValue,
} from '../types/metrics';

export type DropdownOptions<T> = {
    label: string;
    value: T;
    original: Form;
};

export const useGetMetricCategories = (): UseQueryResult<
    MetricTypeCategory[],
    Error
> => {
    return useSnackQuery({
        queryKey: ['metricTypes'],
        queryFn: () => getRequest('/api/metrictypes/'),
        options: {
            staleTime: 1000 * 60 * 15, // in MS
            cacheTime: 1000 * 60 * 5,
            select: (data: MetricType[]) => {
                const groupedPerCategory = Object.groupBy(
                    data,
                    ({ category }) => category,
                );
                return Object.keys(groupedPerCategory).map(category => {
                    return {
                        name: category,
                        items: groupedPerCategory[category],
                    };
                });
            },
        },
    });
};

interface MetricValuesParams {
    metricTypeId?: number | null;
    orgUnitId?: number | null;
}

export const useGetMetricOrgUnits = (
    filters: MetricsFilters | undefined,
    transformFn: (metricOrgUnitIds: number[]) => void,
) => {
    return useQuery({
        queryKey: ['filterMetricOrgUnits', filters],
        queryFn: async () => {
            const data = await getRequest(
                `/api/metricorgunits/?json_filter=${JSON.stringify(filters)}`,
            );
            return transformFn(
                data?.map((item: { org_unit_id: number }) => item.org_unit_id),
            );
        },
        enabled: Boolean(filters),
    });
};

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
