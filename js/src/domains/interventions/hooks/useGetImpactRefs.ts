import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { ImpactRefs } from '../types/intervention';

export const useGetImpactRefs = (): UseQueryResult<ImpactRefs> => {
    return useSnackQuery({
        queryKey: ['impactRefs'],
        queryFn: () => getRequest('/api/snt_malaria/impact_refs/'),
        options: {
            staleTime: Infinity,
            retry: false,
            refetchOnWindowFocus: false,
        },
        ignoreErrorCodes: [404],
    });
};
