import { postRequest } from 'bluesquare-components';
import { UseMutationResult } from 'react-query';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { MetricTypeCriterion } from '../types/scenarioRule';
import { matchingCriteriaToJsonLogic } from '../utils/jsonLogic';

type Payload = {
    matching_criteria: MetricTypeCriterion[];
    org_units_excluded?: string; // comma separated list of org unit ids
    org_units_included?: string; // comma separated list of org unit ids
};

export const usePreviewScenarioRule = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: (body: Partial<Payload>) => {
            const matching_criteria = body.matching_criteria
                ? matchingCriteriaToJsonLogic(body.matching_criteria)
                : undefined;

            const org_units_excluded = body.org_units_excluded?.split(',');
            const org_units_included = body.org_units_included?.split(',');

            return postRequest(`/api/snt_malaria/scenario_rules/preview/`, {
                matching_criteria,
                org_units_excluded,
                org_units_included,
            });
        },
        showSuccessSnackBar: false,
    });
