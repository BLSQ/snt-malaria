import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockUseSnackMutation, mockPostRequest } = vi.hoisted(() => ({
    mockUseSnackMutation: vi.fn(),
    mockPostRequest: vi.fn(),
}));

vi.mock('Iaso/libs/apiHooks', () => ({
    useSnackMutation: mockUseSnackMutation,
}));

vi.mock('Iaso/libs/Api', () => ({
    postRequest: mockPostRequest,
}));

describe('useDuplicateIntervention', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseSnackMutation.mockReturnValue({ mutateAsync: vi.fn() });
    });

    it('posts to the intervention duplicate endpoint for the given id', async () => {
        const { useDuplicateIntervention } =
            await import('./useDuplicateIntervention');

        renderHook(() => useDuplicateIntervention());

        const { mutationFn } = mockUseSnackMutation.mock.calls[0][0];
        mutationFn(42);

        expect(mockPostRequest).toHaveBeenCalledWith(
            '/api/snt_malaria/interventions/42/duplicate/',
            {},
        );
    });

    it('invalidates the intervention categories query on success', async () => {
        const { useDuplicateIntervention } =
            await import('./useDuplicateIntervention');

        renderHook(() => useDuplicateIntervention());

        const { invalidateQueryKey } = mockUseSnackMutation.mock.calls[0][0];

        expect(invalidateQueryKey).toEqual(['interventionCategories']);
    });
});
