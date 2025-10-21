import { UseMutationResult, useQueryClient } from 'react-query';
import { postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { InterventionCostBreakdownLine } from '../types/InterventionCostBreakdownLine';

export const useUpdateInterventionCostBreakdownLines =
    (): UseMutationResult => {
        const queryClient = useQueryClient();

        return useSnackMutation({
            mutationFn: (body: {
                interventionId: number;
                year: number;
                costs: InterventionCostBreakdownLine[];
            }) => {
                return Promise.all([
                    postRequest(
                        `/api/snt_malaria/intervention_cost_breakdown_lines/`,
                        {
                            intervention: body.interventionId,
                            year: body.year,
                            costs: body.costs,
                        },
                    ),
                ]);
            },
            options: {
                onSuccess: (
                    _data,
                    variables: { interventionId: number; year: number },
                ) => {
                    queryClient.invalidateQueries(
                        `interventionCostBreakdownLines_${variables.interventionId}_${variables.year}`,
                    );
                    queryClient.invalidateQueries('interventionCategories');
                },
            },
        });
    };
