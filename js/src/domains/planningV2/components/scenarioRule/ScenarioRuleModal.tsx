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
import { InterventionCategory } from '../../../planning/types/interventions';
import { MetricTypeCategory } from '../../../planning/types/metrics';
import { useCreateScenarioRule } from '../../hooks/useCreateScenarioRule';
import {
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
    metricTypeCategories: MetricTypeCategory[];
    interventionCategories: InterventionCategory[];
    rule?: ScenarioRule;
};

const ScenarioRuleDialog: FC<Props> = ({
    scenarioId,
    isOpen,
    closeDialog,
    onClose,
    metricTypeCategories,
    interventionCategories,
    rule,
}) => {
    const { mutate: createScenarioRule, isLoading: isSaving } =
        useCreateScenarioRule(scenarioId);

    const onSubmit = (values: ScenarioRuleFormValues) => {
        createScenarioRule(values, {
            onSuccess: () => {
                closeDialog();
            },
        });
    };

    const initialValues: ScenarioRuleFormValues | undefined = useMemo(
        () =>
            rule && {
                id: rule.id,
                name: rule.name,
                color: rule.color,
                intervention_properties: rule.intervention_properties,
                metric_criteria: rule.matching_criteria,
            },
        [rule],
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
                rule ? MESSAGES.updateScenarioRule : MESSAGES.createScenarioRule
            }
            closeOnConfirm={false}
            allowConfirm={formik.isValid && !isSaving}
        >
            <FormikProvider value={formik}>
                <ScenarioRuleForm
                    metricTypeCategories={metricTypeCategories}
                    interventionCategories={interventionCategories}
                />
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
