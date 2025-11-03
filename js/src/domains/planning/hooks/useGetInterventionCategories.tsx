import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { InterventionCategory } from '../types/interventions';

export const useGetInterventionCategories = (): UseQueryResult<
    InterventionCategory[],
    Error
> => {
    return useSnackQuery({
        queryKey: ['interventionCategories'],
        queryFn: () => getRequest('/api/snt_malaria/intervention_categories/'),
    });
};
