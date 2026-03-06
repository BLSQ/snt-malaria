import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { ImpactYearRange } from '../types';

export const useGetImpactYearRange = (): UseQueryResult<ImpactYearRange> => {
    return useSnackQuery({
        queryKey: ['impactYearRange'],
        queryFn: () => getRequest('/api/snt_malaria/impact_year_range/'),
        options: {
            staleTime: Infinity,
            retry: false,
            refetchOnWindowFocus: false,
        },
    });
};
