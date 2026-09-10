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
};

/** Confirmation shown when the user leaves the wizard with unsaved progress.
 *  Rendered by the page so it survives the sidebar swapping to the composite node
 *  editor on the graph step. `titleMessage`/`message` are resolved by the wizard
 *  controller, which is the only place that knows whether this is an edit run and
 *  what layer type it is. */
export const DiscardWizardModal: FC<Props> = ({
    open,
    titleMessage,
    message,
    onConfirm,
    onCancel,
}) => {
    const { formatMessage } = useSafeIntl();
    if (!open) return null;
    return (
        <ConfirmCancelModal
            open={open}
            id="data-layer-wizard-discard"
            dataTestId="data-layer-wizard-discard"
            titleMessage={titleMessage}
            onConfirm={onConfirm}
            onCancel={onCancel}
            closeDialog={onCancel}
            onClose={onCancel}
            confirmMessage={MESSAGES.cancel}
            cancelMessage={MESSAGES.wizardBack}
        >
            <Typography>{formatMessage(message)}</Typography>
        </ConfirmCancelModal>
    );
};
