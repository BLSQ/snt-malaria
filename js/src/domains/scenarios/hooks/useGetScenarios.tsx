import { defineMessages } from 'react-intl';
import { UseMutationResult, UseQueryResult } from 'react-query';
import { getRequest, postRequest, putRequest } from 'Iaso/libs/Api';
import { useSnackMutation, useSnackQuery } from 'Iaso/libs/apiHooks';
import { Scenario } from '../types';

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

export const useGetScenarios = (): UseQueryResult<Scenario[], Error> => {
    return useSnackQuery({
        queryKey: ['scenarios'],
        queryFn: () => getRequest('/api/snt_malaria/scenarios/'),
        options: {
            staleTime: 1000 * 60 * 15, // in MS
            cacheTime: 1000 * 60 * 5,
        },
    });
};

export const useGetScenario = (
    scenarioId: number,
): UseQueryResult<Scenario, Error> => {
    return useSnackQuery({
        queryKey: ['scenarios', scenarioId],
        queryFn: () => getRequest(`/api/snt_malaria/scenarios/${scenarioId}`),
        options: {
            staleTime: 1000 * 60 * 15, // in MS
            cacheTime: 1000 * 60 * 5,
        },
    });
};

export const useCreateScenario = (): UseMutationResult => {
    const name = `New scenario - ${new Date().toLocaleString()}`;

    return useSnackMutation({
        mutationFn: () => postRequest('/api/snt_malaria/scenarios/', { name }),
        invalidateQueryKey: ['scenarios'],
    });
};

export const useUpdateScenario = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: (body: Scenario) =>
            putRequest(`/api/snt_malaria/scenarios/${body.id}/`, body),
        invalidateQueryKey: ['scenarios'],
    });

export const useDuplicateScenario = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: (idToDuplicate: number) =>
            postRequest(`/api/snt_malaria/scenarios/duplicate/`, {
                id_to_duplicate: idToDuplicate,
            }),
        invalidateQueryKey: ['scenarios'],
        snackSuccessMessage: MESSAGES.duplicateSuccess,
        snackErrorMsg: MESSAGES.duplicateError,
    });
