import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { ImpactProviderMeta } from '../types';

export const useGetImpactProviderMeta =
    (): UseQueryResult<ImpactProviderMeta> => {
        return useSnackQuery({
            queryKey: ['impactProviderMeta'],
            queryFn: () => getRequest('/api/snt_malaria/impact_provider_meta/'),
            options: {
                staleTime: Infinity,
                retry: false,
                refetchOnWindowFocus: false,
            },
        });
    };
