import { UseQueryResult } from 'react-query';

import { Form } from '../../../../../hat/assets/js/apps/Iaso/domains/forms/types/forms';
import { getRequest } from '../../../../../hat/assets/js/apps/Iaso/libs/Api';
import { useSnackQuery } from '../../../../../hat/assets/js/apps/Iaso/libs/apiHooks';

export type DropdownOptions<T> = {
    label: string;
    value: T;
    original: Form;
};

export const useGetMetricTypes = (): UseQueryResult<
    DropdownOptions<string>[],
    Error
> => {
    return useSnackQuery({
        queryKey: ['metrictypes'],
        queryFn: () => getRequest('/api/metrictypes/'),
        options: {
            // staleTime: 1000 * 60 * 15, // in MS
            // cacheTime: 1000 * 60 * 5,
            // enabled: Boolean(appId),
            select: data => console.log(data),
            // data?.forms?.map(t => ({
            //     label: t.name,
            //     value: t.id,
            //     original: t,
            // })) || [],
        },
    });
};
