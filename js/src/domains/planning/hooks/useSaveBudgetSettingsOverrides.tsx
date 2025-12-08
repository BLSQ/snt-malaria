import { UseMutationResult } from 'react-query';
import { postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { InterventionBudgetSettings } from '../types/interventions';

const percentageFields = [
    'coverage',
    'tablet_factor',
    'pop_prop_3_11',
    'pop_prop_12_59',
];

const transformValues = (budgetSettings: InterventionBudgetSettings[]) =>
    budgetSettings.map(values => {
        const costOverrides = Object.entries(values).reduce(
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
        costOverrides.intervention_id = values.intervention_id;
        return costOverrides;
    });

export const useSaveBudgetSettingsOverrides = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: ({
            scenarioId,
            budgetSettings,
        }: {
            scenarioId: number;
            budgetSettings: InterventionBudgetSettings[];
        }) =>
            postRequest(
                `/api/snt_malaria/budget_settings_overrides/?scenario_id${scenarioId}`,
                transformValues(budgetSettings),
            ),
        invalidateQueryKey: ['intervention_categories'],
    });
