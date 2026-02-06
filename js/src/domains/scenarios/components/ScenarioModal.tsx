import React, { FC, useMemo, useRef } from 'react';
import CopyAllOutlinedIcon from '@mui/icons-material/CopyAllOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { Button, IconButton } from '@mui/material';
import {
    ConfirmCancelModal,
    IntlMessage,
    makeFullModal,
    useSafeIntl,
} from 'bluesquare-components';
import { UseMutateFunction } from 'react-query';
import { MESSAGES } from '../../messages';
import { useCreateScenario } from '../hooks/useCreateScenario';
import { useDuplicateScenario } from '../hooks/useDuplicateScenario';
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

interface ScenarioDialogProps {
    isOpen: boolean;
    closeDialog: () => void;
    onClose: (shouldRedirect: number | boolean) => void;
    scenario?: Scenario;
    titleMessage?: string;
    operation: UseMutateFunction<unknown, unknown, Scenario, unknown>;
    confirmMessage?: IntlMessage;
}

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

    const callbackRef = useRef<() => void>();
    const handleOnRef = (callback: () => void) => {
        callbackRef.current = callback;
    };

    const handleConfirm = () => {
        if (callbackRef?.current) {
            callbackRef.current();
        }
    };

    const handleSubmit = (values: Scenario) => {
        operation(values, {
            onSuccess: (data: Scenario) => {
                closeDialog();
                onClose(data.id);
            },
        });
    };

    const title = useMemo(
        () =>
            titleMessage ||
            formatMessage(scenario ? MESSAGES.edit : MESSAGES.create),
        [formatMessage, scenario, titleMessage],
    );

    return (
        <ConfirmCancelModal
            open={isOpen}
            onClose={() => onClose(false)}
            id={'scenario-dialog'}
            dataTestId={'scenario-dialog'}
            titleMessage={title}
            closeDialog={closeDialog}
            onConfirm={handleConfirm}
            onCancel={() => onClose(false)}
            confirmMessage={confirmMessage}
            cancelMessage={MESSAGES.cancel}
            closeOnConfirm={false}
        >
            <ScenarioForm
                onSubmit={handleSubmit}
                formValues={scenario}
                onSubmitFormRef={handleOnRef}
            />
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
