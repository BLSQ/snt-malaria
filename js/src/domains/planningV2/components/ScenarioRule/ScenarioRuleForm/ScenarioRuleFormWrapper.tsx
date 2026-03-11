import React, { FC, useCallback, useMemo } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { FormikProvider } from 'formik';
import { CardStyled } from '../../../../../components/CardStyled';
import { MESSAGES } from '../../../../messages';
import { useCreateUpdateScenarioRule } from '../../../hooks/useCreateUpdateScenarioRule';
import {
    defaultScenarioRuleValues,
    ScenarioRuleFormValues,
    useScenarioRuleFormState,
} from '../../../hooks/useScenarioRuleFormState';
import { ScenarioRule } from '../../../types/scenarioRule';
import { ScenarioRuleForm } from './ScenarioRuleForm';
import { ScenarioRuleFormHeader } from './ScenarioRuleFormHeader';

type Props = {
    scenarioId: number;
    rule?: ScenarioRule;
    onClose: () => void;
};

export const ScenarioRuleFormWrapper: FC<Props> = ({
    scenarioId,
    rule,
    onClose,
}) => {
    const { formatMessage } = useSafeIntl();

    const { mutate: createUpdateScenarioRule, isLoading: isSubmittingRule } =
        useCreateUpdateScenarioRule(scenarioId);

    const initialValues: ScenarioRuleFormValues | undefined = useMemo(
        () =>
            rule
                ? {
                      id: rule.id,
                      scenario: rule.scenario,
                      name: rule.name,
                      color: rule.color,
                      intervention_properties: rule.intervention_properties,
                      matching_criteria: rule.matching_criteria,
                      org_units_excluded: rule.org_units_excluded,
                      org_units_included: rule.org_units_included,
                  }
                : { ...defaultScenarioRuleValues, scenario: scenarioId },
        [rule, scenarioId],
    );

    const onSubmit = useCallback(
        (values: Partial<ScenarioRuleFormValues>) => {
            createUpdateScenarioRule(values, {
                onSuccess: () => {
                    onClose();
                },
            });
        },
        [createUpdateScenarioRule, onClose],
    );

    const formik = useScenarioRuleFormState({
        onSubmit,
        initialValues,
        editMode: !!rule,
    });

    return (
        <CardStyled
            header={
                <ScenarioRuleFormHeader
                    title={formatMessage(
                        rule
                            ? MESSAGES.editScenarioRule
                            : MESSAGES.createScenarioRule,
                    )}
                    onCancel={onClose}
                    onSubmit={formik.handleSubmit}
                    disabled={isSubmittingRule}
                />
            }
            isLoading={isSubmittingRule}
        >
            <FormikProvider value={formik}>
                <ScenarioRuleForm />
            </FormikProvider>
        </CardStyled>
    );
};
