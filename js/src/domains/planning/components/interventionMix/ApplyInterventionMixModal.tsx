import React, { FC } from 'react';
import { Box, Divider, Typography } from '@mui/material';
import {
    ConfirmCancelModal,
    makeFullModal,
    useSafeIntl,
} from 'bluesquare-components';
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
    const { formatMessage } = useSafeIntl();
    return (
        // @ts-ignore
        <ConfirmCancelModal
            open={isOpen}
            closeDialog={closeDialog}
            onClose={() => null}
            onCancel={() => null}
            confirmMessage={MESSAGES.overrideMix}
            cancelMessage={MESSAGES.cancel}
            id="apply_intervention_mix"
            maxWidth="md"
            titleMessage={MESSAGES.mixConflicts}
        >
            <Box mb={2}>
                <Divider sx={{ width: '100%' }} />
            </Box>
            <Typography variant="body1">
                {formatMessage(MESSAGES.applyMixMessage)}
            </Typography>
            {/* <TableWithDeepLink /> */}

            <Box mt={2}>
                <Divider sx={{ width: '100%' }} />
            </Box>
        </ConfirmCancelModal>
    );
};

const applyMixButton = makeFullModal(
    ApplyInterventionsMixModal,
    ApplyInterventionsMixButton,
);

export { applyMixButton as ApplyInterventionsMix };
