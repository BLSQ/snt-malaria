import React, { FunctionComponent } from 'react';
import { Box, Button } from '@mui/material';
import {
    ConfirmCancelModal,
    makeFullModal,
    useSafeIntl,
} from 'bluesquare-components';
import { MESSAGES } from '../../messages';
import { InterventionCategories } from '../interventionMix/InterventionCategories';
import { ConfirmButtonStyles } from './ConfirmButtonStyles';
import { EditInterventionMixButton } from './EditInterventionMixButton';

type Props = {
    isOpen: boolean;
    closeDialog: () => void;
    mix: any;
    setHoveredMixName: (status: boolean) => void;
};
const EditInterventionMixModal: FunctionComponent<Props> = ({
    isOpen,
    closeDialog,
    mix,
    setHoveredMixName,
}) => {
    const { formatMessage } = useSafeIntl();
    return (
        <>
            <ConfirmCancelModal
                dataTestId="edit-mix-modal"
                id="edit-mix-modal"
                open={isOpen}
                closeDialog={closeDialog}
                onConfirm={() => null}
                onClose={() => setHoveredMixName(false)}
                onCancel={() => null}
                cancelMessage={MESSAGES.cancel}
                confirmMessage={MESSAGES.updateMix}
                titleMessage={formatMessage(MESSAGES.editMixTitle)}
                allowConfirm
                allowConfirmAdditionalButton
            >
                <Box sx={{ ml: '-10px' }}>
                    <InterventionCategories
                        selectedInterventions={mix.interventions.map(
                            intervention => intervention.id,
                        )}
                        setSelectedInterventions={() => null}
                    />
                    <Box sx={{ position: 'absolute', bottom: 10, left: 20 }}>
                        <Button
                            sx={{
                                color: '#D32F2F',
                                textTransform: 'capitalize',
                                fontWeight: 'bold',
                            }}
                        >
                            {formatMessage(MESSAGES.deleteMix)}
                        </Button>
                    </Box>
                </Box>
            </ConfirmCancelModal>
            <ConfirmButtonStyles />
        </>
    );
};
const EditMixModal = makeFullModal(
    EditInterventionMixModal,
    EditInterventionMixButton,
);

export { EditMixModal as EditInterventionMix };
