import { ScenarioRuleResponse } from '../hooks/useGetScenarioRules';
import { ScenarioRule } from '../types/scenarioRule';
import { jsonLogicToMatchingCriteria } from './jsonLogic';

const isMatchAll = (criteria: unknown): boolean =>
    typeof criteria === 'object' &&
    criteria !== null &&
    (criteria as Record<string, unknown>).all === true;

export const mapResponseToScenarioRule = (
    response: ScenarioRuleResponse,
): ScenarioRule => ({
    id: response.id,
    name: response.name,
    scenario: response.scenario,
    priority: response.priority,
    color: response.color,
    is_match_all: isMatchAll(response.matching_criteria),
    matching_criteria:
        response.matching_criteria == null ||
            isMatchAll(response.matching_criteria)
            ? []
            : jsonLogicToMatchingCriteria(response.matching_criteria),
    intervention_properties: response.intervention_properties,
    org_units_excluded: response.org_units_excluded?.join(','),
    org_units_included: response.org_units_included?.join(','),
});

export const mapResponseToScenarioRules = (
    responses: ScenarioRuleResponse[],
): ScenarioRule[] => {
    const criteria: ScenarioRule[] = [];
    responses.forEach(response => {
        criteria.push({
            ...mapResponseToScenarioRule(response),
        });
    });
    return criteria;
};
