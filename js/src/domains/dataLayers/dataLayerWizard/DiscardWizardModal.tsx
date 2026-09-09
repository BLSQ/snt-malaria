import React, { FC } from 'react';
import { Typography } from '@mui/material';
import { ConfirmCancelModal, useSafeIntl } from 'bluesquare-components';
import { MESSAGES } from '../messages';

type Props = {
    open: boolean;
    isComposite: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

/** "Nothing is saved yet" confirmation, shown when the user leaves the creation
 *  wizard with unsaved progress. Rendered by the page so it survives the sidebar
 *  swapping to the composite node editor on the graph step. */
export const DiscardWizardModal: FC<Props> = ({
    open,
    isComposite,
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
            titleMessage={MESSAGES.wizardTitle}
            onConfirm={onConfirm}
            onCancel={onCancel}
            closeDialog={onCancel}
            onClose={onCancel}
            confirmMessage={MESSAGES.cancel}
            cancelMessage={MESSAGES.wizardBack}
        >
            <Typography>
                {formatMessage(
                    isComposite
                        ? MESSAGES.wizardDiscardGraphConfirm
                        : MESSAGES.wizardDiscardLayerConfirm,
                )}
            </Typography>
        </ConfirmCancelModal>
    );
};
