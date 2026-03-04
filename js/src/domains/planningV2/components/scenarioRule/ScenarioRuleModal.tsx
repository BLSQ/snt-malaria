import React, { FC, useCallback, useMemo } from 'react';
import EditIcon from '@mui/icons-material/Edit';
import { Button } from '@mui/material';
import {
    ConfirmCancelModal,
    makeFullModal,
    useSafeIntl,
} from 'bluesquare-components';
import { FormikProvider } from 'formik';
import { EditIconButton } from 'Iaso/components/Buttons/EditIconButton';
import { MESSAGES } from '../../../messages';
import { useCreateUpdateScenarioRule } from '../../hooks/useCreateUpdateScenarioRule';
import {
    defaultScenarioRuleValues,
    ScenarioRuleFormValues,
    useScenarioRuleFormState,
} from '../../hooks/useScenarioRuleFormState';
import { ScenarioRule } from '../../types/scenarioRule';
import { ScenarioRuleForm } from './ScenarioRuleForm';

type ScenarioRuleAction = {
    onClick: () => void;
};

const ScenarioRuleDialogAction: FC<ScenarioRuleAction> = ({ onClick }) => {
    const { formatMessage } = useSafeIntl();

    return (
        <Button onClick={onClick}>
            {formatMessage(MESSAGES.createScenarioRule)}
        </Button>
    );
};

const ScenarioRuleDialogIconAction: FC<ScenarioRuleAction> = ({ onClick }) => {
    return <EditIconButton onClick={onClick} overrideIcon={EditIcon} />;
};

type Props = {
    scenarioId: number;
    isOpen: boolean;
    closeDialog: () => void;
    onClose: () => void;
    rule?: ScenarioRule;
};

const ScenarioRuleDialog: FC<Props> = ({
    scenarioId,
    isOpen,
    closeDialog,
    onClose,
    rule,
}) => {
    const { mutate: createUpdateScenarioRule, isLoading: isSaving } =
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

    const getModifiedValues = useCallback(
        (values: ScenarioRuleFormValues) => {
            if (!rule) return values;
            return Object.entries(values).reduce((acc, [key, value]) => {
                if (key === 'id' || key === 'scenario') {
                    acc[key] = value;
                } else if (
                    JSON.stringify(value) !==
                    JSON.stringify(
                        initialValues[key as keyof ScenarioRuleFormValues],
                    )
                ) {
                    acc[key] = value;
                }
                return acc;
            }, {} as Partial<ScenarioRuleFormValues>);
        },
        [initialValues, rule],
    );

    const onSubmit = useCallback(
        (values: ScenarioRuleFormValues) => {
            const changedValues = getModifiedValues(values);
            createUpdateScenarioRule(changedValues, {
                onSuccess: () => {
                    closeDialog();
                },
            });
        },
        [createUpdateScenarioRule, closeDialog, getModifiedValues],
    );
    const formik = useScenarioRuleFormState({ onSubmit, initialValues });

    const handleOnClose = useCallback(() => {
        formik.resetForm();
        onClose();
    }, [formik, onClose]);

    return (
        <ConfirmCancelModal
            dataTestId="import-scenario-modal"
            id="import-scenario-modal"
            open={isOpen}
            closeDialog={closeDialog}
            onConfirm={formik.handleSubmit}
            onClose={handleOnClose}
            onCancel={handleOnClose}
            cancelMessage={MESSAGES.cancel}
            confirmMessage={rule ? MESSAGES.edit : MESSAGES.create}
            titleMessage={
                rule ? MESSAGES.editScenarioRule : MESSAGES.createScenarioRule
            }
            closeOnConfirm={false}
            allowConfirm={formik.dirty && formik.isValid && !isSaving}
        >
            <FormikProvider value={formik}>
                <ScenarioRuleForm />
            </FormikProvider>
        </ConfirmCancelModal>
    );
};

export const CreateScenarioRuleModal = makeFullModal(
    ScenarioRuleDialog,
    ScenarioRuleDialogAction,
);

export const EditScenarioRuleModal = makeFullModal(
    ScenarioRuleDialog,
    ScenarioRuleDialogIconAction,
);
