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
    isOpen: boolean;
    closeDialog: () => void;
    onClose: () => void;
    metricTypeCategories: MetricTypeCategory[];
    interventionCategories: InterventionCategory[];
};
const ScenarioRuleDialog: FC<Props> = ({
    isOpen,
    closeDialog,
    onClose,
    metricTypeCategories,
    interventionCategories,
}) => {
    const onSubmit = (values: ScenarioRuleFormValues) => {
        console.log(values);
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
            allowConfirm={formik.isValid}
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
