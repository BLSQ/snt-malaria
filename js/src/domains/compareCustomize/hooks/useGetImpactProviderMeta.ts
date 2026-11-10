import { UseQueryResult } from 'react-query';
import { useLocale } from 'Iaso/domains/app/contexts/LocaleContext';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { ImpactProviderMeta } from '../types';

export const useGetImpactProviderMeta =
    (): UseQueryResult<ImpactProviderMeta> => {
        const { locale } = useLocale();
        return useSnackQuery({
            queryKey: ['impactProviderMeta', locale],
            queryFn: () => getRequest('/api/snt_malaria/impact_provider_meta/'),
            options: {
                staleTime: Infinity,
                retry: false,
                refetchOnWindowFocus: false,
            },
        });
    };
