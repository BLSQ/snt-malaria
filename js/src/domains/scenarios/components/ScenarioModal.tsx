import React, { FC, useCallback, useMemo } from 'react';
import CopyAllOutlinedIcon from '@mui/icons-material/CopyAllOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { Button, IconButton } from '@mui/material';
import {
    ConfirmCancelModal,
    IntlMessage,
    makeFullModal,
    useSafeIntl,
} from 'bluesquare-components';
import { FormikProvider } from 'formik';
import { UseMutateFunction } from 'react-query';
import { MESSAGES } from '../../messages';
import { useCreateScenario } from '../hooks/useCreateScenario';
import { useDuplicateScenario } from '../hooks/useDuplicateScenario';
import {
    ScenarioFormValues,
    useScenarioFormState,
} from '../hooks/useScenarioFormState';
import { useUpdateScenario } from '../hooks/useUpdateScenario';
import { Scenario } from '../types';
import ScenarioForm from './ScenarioForm';

type ScenarioDialogActionProps = {
    onClick: () => void;
    color?:
        | 'primary'
        | 'inherit'
        | 'secondary'
        | 'success'
        | 'error'
        | 'info'
        | 'warning';
};

const CreateScenarioDialogAction: FC<ScenarioDialogActionProps> = ({
    onClick,
    color = 'primary',
}) => {
    const { formatMessage } = useSafeIntl();
    return (
        <Button
            variant="contained"
            color={color}
            size="small"
            onClick={onClick}
        >
            {formatMessage(MESSAGES.createScenario)}
        </Button>
    );
};

const UpdateScenarioDialogAction: FC<ScenarioDialogActionProps> = ({
    onClick,
    color = 'primary',
}) => (
    <IconButton onClick={onClick} color={color}>
        <EditOutlinedIcon />
    </IconButton>
);

const DuplicateScenarioDialogAction: FC<ScenarioDialogActionProps> = ({
    onClick,
    color = 'primary',
}) => {
    const { formatMessage } = useSafeIntl();
    return (
        <Button variant="text" onClick={onClick} color={color}>
            <CopyAllOutlinedIcon sx={{ marginRight: '0.5rem' }} />
            {formatMessage(MESSAGES.duplicate)}
        </Button>
    );
};

type ScenarioDialogProps = {
    isOpen: boolean;
    closeDialog: () => void;
    onClose: (shouldRedirect: number | boolean) => void;
    scenario?: Scenario;
    titleMessage?: string;
    operation: UseMutateFunction<unknown, unknown, ScenarioFormValues, unknown>;
    confirmMessage?: IntlMessage;
};

const ScenarioDialog: FC<ScenarioDialogProps> = ({
    isOpen,
    closeDialog,
    onClose,
    scenario = undefined,
    titleMessage = undefined,
    operation,
    confirmMessage = MESSAGES.create,
}) => {
    const { formatMessage } = useSafeIntl();

    const onSubmit = (values: ScenarioFormValues) => {
        operation(values, {
            onSuccess: (data: Scenario) => {
                closeDialog();
                onClose(data.id);
            },
        });
    };
    const formik = useScenarioFormState(scenario, onSubmit);

    const handleOnClose = useCallback(() => {
        formik.resetForm();
        onClose(false);
    }, [formik, onClose]);

    const title = useMemo(
        () =>
            titleMessage ||
            formatMessage(scenario ? MESSAGES.edit : MESSAGES.create),
        [formatMessage, scenario, titleMessage],
    );

    return (
        <ConfirmCancelModal
            open={isOpen}
            onClose={handleOnClose}
            id={'scenario-dialog'}
            dataTestId={'scenario-dialog'}
            titleMessage={title}
            closeDialog={closeDialog}
            onConfirm={formik.handleSubmit}
            onCancel={handleOnClose}
            confirmMessage={confirmMessage}
            cancelMessage={MESSAGES.cancel}
            closeOnConfirm={false}
        >
            <FormikProvider value={formik}>
                <ScenarioForm />
            </FormikProvider>
        </ConfirmCancelModal>
    );
};

const CreateScenarioDialog: FC<
    Omit<ScenarioDialogProps, 'operation'>
> = props => {
    const { mutate: createScenario } = useCreateScenario();
    return (
        <ScenarioDialog
            {...props}
            operation={createScenario}
            confirmMessage={MESSAGES.create}
        />
    );
};

const DuplicateScenarioDialog: FC<
    Omit<ScenarioDialogProps, 'operation'>
> = props => {
    const { mutate: duplicateScenario } = useDuplicateScenario();
    return (
        <ScenarioDialog
            {...props}
            operation={duplicateScenario}
            confirmMessage={MESSAGES.duplicate}
        />
    );
};

const UpdateScenarioDialog: FC<
    Omit<ScenarioDialogProps, 'operation'>
> = props => {
    const { mutate: updateScenario } = useUpdateScenario(
        props.scenario ? props.scenario.id : 0,
    );
    return (
        <ScenarioDialog
            {...props}
            operation={updateScenario}
            confirmMessage={MESSAGES.edit}
        />
    );
};

export const CreateScenarioModal = makeFullModal(
    CreateScenarioDialog,
    CreateScenarioDialogAction,
);

export const DuplicateScenarioModal = makeFullModal(
    DuplicateScenarioDialog,
    DuplicateScenarioDialogAction,
);

export const UpdateScenarioModal = makeFullModal(
    UpdateScenarioDialog,
    UpdateScenarioDialogAction,
);
