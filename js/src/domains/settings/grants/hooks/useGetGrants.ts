import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { UseQueryResult } from 'react-query';
import { Grant } from '../types';

export const useGetGrants = (): UseQueryResult<Grant[], Error> =>
    useSnackQuery({
        queryKey: ['grants'],
        queryFn: () => getRequest('/api/snt_malaria/grants/'),
        options: {
            cacheTime: Infinity, // disable auto fetch on cache expiration
        },
    });
