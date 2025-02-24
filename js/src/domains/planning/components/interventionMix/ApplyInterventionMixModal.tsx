import React, { FC } from 'react';
import { Box, Divider, Typography } from '@mui/material';
import { ConfirmCancelModal, makeFullModal } from 'bluesquare-components';
import { MESSAGES } from '../../messages';
import { ApplyInterventionsMixButton } from './ApplyInterventionsMixButton';

type Props = {
    isOpen: boolean;
    closeDialog: () => void;
};
export const ApplyInterventionsMixModal: FC<Props> = ({
    isOpen,
    closeDialog,
}) => {
    return (
        <ConfirmCancelModal
            open={isOpen}
            closeDialog={closeDialog}
            onClose={() => null}
            onCancel={() => null}
            confirmMessage={MESSAGES.overrideMix}
            cancelMessage={MESSAGES.cancel}
            id="test"
            titleMessage={MESSAGES.mixConflicts}
        >
            <Divider sx={{ width: '100%'}} />
            <Typography variant="body1">Hello</Typography>
        </ConfirmCancelModal>
    );
};

const applyMixButton = makeFullModal(
    ApplyInterventionsMixModal,
    ApplyInterventionsMixButton,
);

export { applyMixButton as ApplyInterventionsMix };
