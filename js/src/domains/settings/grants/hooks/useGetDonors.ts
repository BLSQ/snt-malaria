import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { UseQueryResult } from 'react-query';
import { Donor } from '../types';

export const useGetDonors = (): UseQueryResult<Donor[], Error> =>
    useSnackQuery({
        queryKey: ['donors'],
        queryFn: () => getRequest('/api/snt_malaria/donors/'),
        options: {
            cacheTime: Infinity, // disable auto fetch on cache expiration
        },
    });
