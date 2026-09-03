import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { OpenHexaDataLayer } from '../types/metrics';

const EMPTY: OpenHexaDataLayer[] = [];

export const useGetOpenHexaDataLayers = (
    enabled = true,
): UseQueryResult<OpenHexaDataLayer[], Error> =>
    useSnackQuery({
        queryKey: ['openHexaDataLayers'],
        queryFn: () => getRequest('/api/snt_malaria/openhexa/data_layers/'),
        dispatchOnError: false,
        options: {
            enabled,
            select: data => data?.results ?? EMPTY,
            // The OpenHexa config changes rarely, so cache it hard - but keep a finite
            // staleTime and a retry so a transient outage doesn't wedge the picker for
            // the whole session (a permanently-mounted observer never refetches otherwise).
            staleTime: 5 * 60 * 1000,
            cacheTime: Infinity,
            retry: 1,
        },
    });
