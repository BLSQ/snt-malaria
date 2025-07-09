import { defineMessages } from 'react-intl';
import { UseMutationResult, UseQueryResult } from 'react-query';
import {
    deleteRequest,
    getRequest,
    postRequest,
    putRequest,
} from 'Iaso/libs/Api';
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
    deleteSuccess: {
        id: 'snt_malaria.label.scenario-delete-success',
        defaultMessage: 'Scenario deleted successfully',
    },
    deleteError: {
        id: 'snt_malaria.label.scenario-delete-error',
        defaultMessage: 'Error when deleting Scenario',
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

export const useDuplicateScenario = (
    onSuccess: (data: any) => void = _data => null,
): UseMutationResult =>
    useSnackMutation({
        mutationFn: (idToDuplicate: number) =>
            postRequest(`/api/snt_malaria/scenarios/duplicate/`, {
                id_to_duplicate: idToDuplicate,
            }),
        options: { onSuccess },
        invalidateQueryKey: ['scenarios'],
        snackSuccessMessage: MESSAGES.duplicateSuccess,
        snackErrorMsg: MESSAGES.duplicateError,
    });

export const useDeleteScenario = () =>
    useSnackMutation({
        mutationFn: (id: number) =>
            deleteRequest(`/api/snt_malaria/scenarios/${id}`),
        invalidateQueryKey: ['scenarios'],
        snackSuccessMessage: MESSAGES.deleteSuccess,
        snackErrorMsg: MESSAGES.deleteError,
    });
