import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { CompositeLayer, CompositeLayerListItem } from '../types/compositeLayer';

export const useGetCompositeLayers = (
    enabled = true,
): UseQueryResult<CompositeLayerListItem[], Error> =>
    useSnackQuery({
        queryKey: ['compositeLayers'],
        queryFn: () => getRequest('/api/snt_malaria/composite_layers/'),
        options: {
            enabled,
            cacheTime: Infinity,
        },
    });

export const useGetCompositeLayer = (
    compositeLayerId?: number,
): UseQueryResult<CompositeLayer, Error> =>
    useSnackQuery({
        queryKey: ['compositeLayer', compositeLayerId],
        queryFn: () =>
            getRequest(
                `/api/snt_malaria/composite_layers/${compositeLayerId}/`,
            ),
        options: {
            enabled: Boolean(compositeLayerId),
            // Always refetch the graph when the editor opens: the editor unmounts on close, so a
            // zero cache time drops the entry and avoids rendering a previously-saved graph.
            cacheTime: 0,
            staleTime: 0,
        },
    });
