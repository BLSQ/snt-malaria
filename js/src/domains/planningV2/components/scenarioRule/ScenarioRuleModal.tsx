import React, { FC, useCallback } from 'react';
import { Button } from '@mui/material';
import {
    ConfirmCancelModal,
    makeFullModal,
    useSafeIntl,
} from 'bluesquare-components';
import { FormikProvider } from 'formik';
import { MESSAGES } from '../../../messages';
import { InterventionCategory } from '../../../planning/types/interventions';
import { MetricTypeCategory } from '../../../planning/types/metrics';
import { useCreateScenarioRule } from '../../hooks/useCreateScenarioRule';
import {
    ScenarioRuleFormValues,
    useScenarioRuleFormState,
} from '../../hooks/useScenarioRuleFormState';
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
type Props = {
    scenarioId: number;
    isOpen: boolean;
    closeDialog: () => void;
    onClose: () => void;
    metricTypeCategories: MetricTypeCategory[];
    interventionCategories: InterventionCategory[];
};

const ScenarioRuleDialog: FC<Props> = ({
    scenarioId,
    isOpen,
    closeDialog,
    onClose,
    metricTypeCategories,
    interventionCategories,
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
    const formik = useScenarioRuleFormState({ onSubmit });

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
            confirmMessage={MESSAGES.create}
            titleMessage={MESSAGES.createScenarioRule}
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

export const ScenarioRuleModal = makeFullModal(
    ScenarioRuleDialog,
    ScenarioRuleDialogAction,
);
