// import { getRequest } from 'bluesquare-components';
import { useQuery, UseQueryResult } from 'react-query';
import { ScenarioRule } from '../types/scenarioRule';

const dummyScenarioRulesResponse: ScenarioRule[] = [
    {
        id: 1,
        name: 'Rule 1',
        priority: 1,
        matching_criteria: [
            {
                metric_type: 115,
                operator: '>',
                value: 10,
                string_value: '',
            },
            {
                metric_type: 115,
                operator: '>',
                value: 10,
                string_value: '',
            },
            {
                metric_type: 115,
                operator: '>',
                value: 10,
                string_value: '',
            },
            {
                metric_type: 115,
                operator: '>',
                value: 10,
                string_value: '',
            },
            {
                metric_type: 115,
                operator: '>',
                value: 10,
                string_value: '',
            },
            {
                metric_type: 115,
                operator: '>',
                value: 10,
                string_value: '',
            },
        ],
        color: '#ff0000',
        intervention_properties: [
            {
                intervention_category: 112,
                intervention: 234,
            },
        ],
    },
];

export const useGetScenarioRules = (
    scenarioId: number,
): UseQueryResult<ScenarioRule[], Error> => {
    return useQuery({
        queryKey: ['scenarioRules', scenarioId],
        queryFn: async () => {
            // const response = await getRequest(
            //     `/api/snt_malaria/scenario_rules/?scenario=${scenarioId}`,
            // );

            // return response?.results || [];
            return dummyScenarioRulesResponse;
        },
    });
};
