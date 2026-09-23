import { ScenarioRuleResponse } from '../../planning/hooks/useGetScenarioRules';
import { ScenarioRule } from '../../planning/types/scenarioRule';
import { jsonLogicToMatchingCriteria } from './jsonLogic';

export const mapResponseToScenarioRule = (
    response: ScenarioRuleResponse,
): ScenarioRule => ({
    id: response.id,
    name: response.name,
    scenario: response.scenario,
    priority: response.priority,
    color: response.color,
    is_match_all: response.is_match_all,
    matching_criteria:
        response.matching_criteria == null
            ? []
            : jsonLogicToMatchingCriteria(response.matching_criteria),
    interventions: response.interventions,
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
