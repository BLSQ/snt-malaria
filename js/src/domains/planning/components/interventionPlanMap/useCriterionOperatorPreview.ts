import { useMemo } from 'react';
import {
    ScenarioRulePreviewRequest,
    ScenarioRulePreviewResult,
    usePreviewScenarioRule,
} from '../../hooks/usePreviewScenarioRule';
import { matchingCriteriaToJsonLogic } from '../../utils/jsonLogic';
import { Operator } from '../scenarioRule/scenarioRuleForm/CriterionOperatorSelect';

export const THRESHOLD_OPERATORS: Operator[] = ['>=', '<=', '>', '<', '=='];

const NO_RULES: ScenarioRulePreviewRequest = {};

export const buildOperatorPreviewRules = (
    metricTypeId: number,
    value: number,
): ScenarioRulePreviewRequest =>
    Object.fromEntries(
        THRESHOLD_OPERATORS.map(operator => [
            operator,
            matchingCriteriaToJsonLogic([
                { metric_type: metricTypeId, operator, value },
            ]),
        ]),
    ) as ScenarioRulePreviewRequest;

/** The org units each operator would match at `value`, as that metric's only criterion. */
export const useCriterionOperatorPreview = ({
    metricTypeId,
    value,
    dataLayerYears,
    enabled,
}: {
    metricTypeId: number;
    value: number;
    dataLayerYears?: Record<string, number>;
    enabled: boolean;
}): ScenarioRulePreviewResult | undefined => {
    const rules = useMemo(
        () =>
            enabled ? buildOperatorPreviewRules(metricTypeId, value) : NO_RULES,
        [enabled, metricTypeId, value],
    );
    const { data, isPreviousData } = usePreviewScenarioRule(
        rules,
        dataLayerYears,
    );
    return enabled && !isPreviousData ? data : undefined;
};
