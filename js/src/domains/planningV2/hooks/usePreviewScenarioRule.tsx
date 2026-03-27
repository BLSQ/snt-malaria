import { postRequest } from 'bluesquare-components';
import { UseMutationResult } from 'react-query';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { MetricTypeCriterion } from '../types/scenarioRule';
import { matchingCriteriaToJsonLogic } from '../utils/jsonLogic';

type Payload = {
    match_all?: boolean;
    is_match_all?: boolean;
    matching_criteria: MetricTypeCriterion[];
    org_units_excluded?: string; // comma separated list of org unit ids
    org_units_included?: string; // comma separated list of org unit ids
};

export const usePreviewScenarioRule = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: (body: Partial<Payload>) => {
            let matchingCriteria: Record<string, unknown> | null;
            if (body.match_all || body.is_match_all) {
                matchingCriteria = { all: true };
            } else {
                matchingCriteria = matchingCriteriaToJsonLogic(
                    body.matching_criteria ?? [],
                );
            }

            const org_units_excluded = !!body.org_units_excluded
                ? body.org_units_excluded.split(',')
                : undefined;
            const org_units_included = !!body.org_units_included
                ? body.org_units_included.split(',')
                : undefined;

            if (
                matchingCriteria == null &&
                !org_units_included?.length
            ) {
                return Promise.resolve([]);
            }

            return postRequest(`/api/snt_malaria/scenario_rules/preview/`, {
                matching_criteria: matchingCriteria,
                org_units_excluded,
                org_units_included,
            });
        },
        showSuccessSnackBar: false,
    });
