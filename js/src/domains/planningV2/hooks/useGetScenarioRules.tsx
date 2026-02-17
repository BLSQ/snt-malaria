// import { getRequest } from 'bluesquare-components';
import { useQuery } from 'react-query';

export const useGetScenarioRules = (scenarioId: number) => {
    return useQuery({
        queryKey: ['scenarioRules', scenarioId],
        queryFn: async () => {
            // const response = await getRequest(
            //     `/api/snt_malaria/scenario_rules/?scenario=${scenarioId}`,
            // );
            return response?.results || [];
        },
    });
};
