import { JsonLogicTree } from '@react-awesome-query-builder/mui';
import { Condition, MetricsFilters } from '../../planning/types/metrics';
import { MetricTypeCriterion } from '../types/scenarioRule';

/** Returns `null` when nothing valid to send (cleared value / empty list). */
export const matchingCriteriaToJsonLogic = (
    criteria: MetricTypeCriterion[],
): MetricsFilters | null => {
    const andRules = criteria
        .filter(c => {
            if (c.metric_type == null) return false;
            if (c.string_value?.trim()) return true;
            const v = c.value as unknown;
            if (v == null || v === '') return false;
            return Number.isFinite(Number(v));
        })
        .map(criterion => {
            const s = criterion.string_value?.trim();
            const rhs = s ? s : Number(criterion.value);

            return {
                [criterion.operator]: [{ var: criterion.metric_type }, rhs],
            } as Condition;
        });

    if (andRules.length === 0) {
        return null;
    }

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

    const andLogic = (jsonLogic as Record<string, unknown>)['and'];
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
            operator: operator as MetricTypeCriterion['operator'],
            value: string_value ? undefined : value,
            string_value,
        });
    });

    return criteria;
};
