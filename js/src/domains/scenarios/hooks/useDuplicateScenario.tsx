import { defineMessages } from 'react-intl';
import { UseMutationResult } from 'react-query';
import { postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';

const MESSAGES = defineMessages({
    duplicateSuccess: {
        id: 'snt_malaria.label.scenario-duplicate-success',
        defaultMessage: 'Duplicated scenario successfully',
    },
    duplicateError: {
        id: 'snt_malaria.label.scenario-duplicate-error',
        defaultMessage: 'Error duplicating scenario',
    },
});

export const useDuplicateScenario = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: ({
            id,
            name,
            description,
            start_year,
            end_year,
        }: {
            id: number;
            name: string;
            description: string;
            start_year: number;
            end_year: number;
        }) =>
            postRequest(`/api/snt_malaria/scenarios/duplicate/`, {
                scenario_to_duplicate: id,
                name,
                description,
                start_year,
                end_year,
            }),
        invalidateQueryKey: ['scenarios'],
        snackSuccessMessage: MESSAGES.duplicateSuccess,
        snackErrorMsg: MESSAGES.duplicateError,
    });
