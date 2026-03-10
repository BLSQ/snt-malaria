import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { ImpactAgeGroups } from '../types';

export const useGetImpactAgeGroups = (): UseQueryResult<ImpactAgeGroups> => {
    return useSnackQuery({
        queryKey: ['impactAgeGroups'],
        queryFn: () => getRequest('/api/snt_malaria/impact_age_groups/'),
        options: {
            staleTime: Infinity,
            retry: false,
            refetchOnWindowFocus: false,
        },
    });
};
