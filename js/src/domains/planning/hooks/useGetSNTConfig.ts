import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';

type SntConfig = {
    intervention_org_unit_type_id: number;
    country_org_unit_type_id: number;
};

export const useGetSNTConfig = (): UseQueryResult<SntConfig, Error> => {
    return useSnackQuery({
        queryKey: ['snt_malaria_config'],
        queryFn: () => getRequest('/api/datastore/snt_malaria_config/'),
        options: {
            select: response => response.data,
            retry: false,
        },
        ignoreErrorCodes: [404],
    });
};
