import React, { FC } from 'react';
import { Typography } from '@mui/material';
import {
    ConfirmCancelModal,
    IntlMessage,
    useSafeIntl,
} from 'bluesquare-components';
import { MESSAGES } from '../messages';

type Props = {
    open: boolean;
    titleMessage: IntlMessage;
    message: IntlMessage;
    onConfirm: () => void;
    onCancel: () => void;
    id?: string;
};

export const DiscardWizardModal: FC<Props> = ({
    open,
    titleMessage,
    message,
    onConfirm,
    onCancel,
    id = 'data-layer-wizard-discard',
}) => {
    const { formatMessage } = useSafeIntl();
    if (!open) return null;
    return (
        <ConfirmCancelModal
            open={open}
            id={id}
            dataTestId={id}
            titleMessage={titleMessage}
            onConfirm={onConfirm}
            onCancel={onCancel}
            closeDialog={onCancel}
            onClose={onCancel}
            confirmMessage={MESSAGES.confirm}
            cancelMessage={MESSAGES.cancel}
        >
            <Typography>{formatMessage(message)}</Typography>
        </ConfirmCancelModal>
    );
};
