import { UseMutationResult } from 'react-query';
import { postRequest, putRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { BudgetAssumptions as BudgetAssumptions } from '../types/interventions';

const percentageFields = [
    'coverage',
    'tablet_factor',
    'pop_prop_3_11',
    'pop_prop_12_59',
];

const transformValues = (budgetAssumptions: BudgetAssumptions) => {
    const costOverrides = Object.entries(budgetAssumptions).reduce(
        (acc, [key, value]) => {
            let newValue = value;
            if (percentageFields.includes(key)) {
                newValue = value / 100;
            }

            if (key === 'buffer_mult') {
                newValue = 1 + value / 100;
            }

            return { ...acc, [key]: newValue };
        },
        {} as any,
    );
    costOverrides.age_string = `${costOverrides.pop_prop_3_11}, ${costOverrides.pop_prop_12_59}`;
    return { ...budgetAssumptions, ...costOverrides };
};

const apiUrl = '/api/snt_malaria/budget_assumptions/';

export const useSaveBudgetAssumptions = (
    scenarioId: number,
): UseMutationResult<BudgetAssumptions> =>
    useSnackMutation({
        mutationFn: ({
            budgetAssumptions,
        }: {
            budgetAssumptions: BudgetAssumptions;
        }) =>
            budgetAssumptions.id
                ? putRequest(
                      `${apiUrl}${budgetAssumptions.id}/`,
                      transformValues(budgetAssumptions),
                  )
                : postRequest(apiUrl, transformValues(budgetAssumptions)),
        invalidateQueryKey: [`budget_assumptions_${scenarioId}`],
    });
