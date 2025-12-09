import { UseMutationResult } from 'react-query';
import { postRequest, putRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { InterventionBudgetSettings } from '../types/interventions';
import { InterventionBudgetSettingsForm } from '../components/interventionPlan/InterventionBudgetSettingsForm';

const percentageFields = [
    'coverage',
    'tablet_factor',
    'pop_prop_3_11',
    'pop_prop_12_59',
];

const transformValues = (budgetSettings: InterventionBudgetSettings) => {
    const costOverrides = Object.entries(budgetSettings).reduce(
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
    return { ...budgetSettings, ...costOverrides };
};

const apiUrl = '/api/snt_malaria/budget_settings_overrides/';

export const useSaveBudgetSettingsOverrides = (
    scenarioId: number,
): UseMutationResult<InterventionBudgetSettings> =>
    useSnackMutation({
        mutationFn: ({
            budgetSettings,
        }: {
            budgetSettings: InterventionBudgetSettings;
        }) =>
            budgetSettings.id
                ? putRequest(
                      `${apiUrl}${budgetSettings.id}/`,
                      transformValues(budgetSettings),
                  )
                : postRequest(apiUrl, transformValues(budgetSettings)),
        invalidateQueryKey: [`budget_settings_overrides_${scenarioId}`],
    });
