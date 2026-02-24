import { JsonLogicTree } from '@react-awesome-query-builder/mui';
import { MetricTypeCriterion } from '../types/scenarioRule';

export const matchingCriteriaToJsonLogic = (
    criteria: MetricTypeCriterion[],
): { and: any[] } => {
    const andRules = criteria.map(criterion => ({
        [criterion.operator]: [
            { var: criterion.metric_type },
            criterion.string_value || criterion.value,
        ],
    }));

    return { and: andRules };
};

// Transform matching criteria from json_logic format to MetricTypeCriterion[]
// Example of json_logic format:
// {
//     "and": [
//         {
//             ">": [
//                 { "var": "metric_type_1" },
//                 10
//             ]
//         },
//         {
//             "<=": [
//                 { "var": "metric_type_2" },
//                 5
//             ]
//         }
//     ]
// }
export const jsonLogicToMatchingCriteria = (
    jsonLogic: JsonLogicTree,
): MetricTypeCriterion[] => {
    if (typeof jsonLogic !== 'object' || jsonLogic === null) {
        return [];
    }

    const andLogic = jsonLogic['and'];
    if (!andLogic || !Array.isArray(andLogic)) {
        return [];
    }

    const criteria: MetricTypeCriterion[] = [];

    andLogic.forEach((criterion: any) => {
        const operator = Object.keys(criterion)[0];
        const [condition, value] = criterion[operator];
        const metric_type = condition.var;

        const string_value = typeof value === 'string' ? value : undefined;

        criteria.push({
            metric_type,
            operator,
            value: string_value ? undefined : value,
            string_value,
        });
    });

    return criteria;
};
