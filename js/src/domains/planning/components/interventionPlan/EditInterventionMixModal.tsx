import React, { FunctionComponent } from 'react';
import { Box, Button, Typography } from '@mui/material';
import {
    ConfirmCancelModal,
    makeFullModal,
    useSafeIntl,
} from 'bluesquare-components';
import { MESSAGES } from '../../messages';
import { InterventionCategories } from '../interventionMix/InterventionCategories';
import { EditInterventionMixButton } from './EditInterventionMixButton';

type Props = {
    isOpen: boolean;
    closeDialog: () => void;
    mix: any;
    scenarioId: number;
};
const EditInterventionMixModal: FunctionComponent<Props> = ({
    isOpen,
    closeDialog,
    mix,
    scenarioId,
}) => {
    const { formatMessage } = useSafeIntl();
    const titleMessage = formatMessage(MESSAGES.editMixTitle);
    return (
        <ConfirmCancelModal
            dataTestId="edit-mix-modal"
            id="edit-mix-modal"
            open={isOpen}
            closeDialog={closeDialog}
            onConfirm={() => console.log('onConfirm')}
            onClose={() => null}
            onCancel={() => console.log('reset form')}
            cancelMessage={MESSAGES.cancel}
            confirmMessage={MESSAGES.addMap}
            titleMessage={titleMessage}
            allowConfirm
            allowConfirmAdditionalButton
        >
            <InterventionCategories
                scenarioId={scenarioId}
                selectedOrgUnits={[]}
                selectedInterventions={mix.interventions.map(
                    intervention => intervention.id,
                )}
                setIsButtonDisabled={() => console.log('setIsButtonDisabled')}
                setSelectedInterventions={() =>
                    console.log('setSelectedInterventions')
                }
            />
            <Box sx={{ position: 'absolute', bottom: 10, left: 20 }}>
                <Button>Delete Mix</Button>
            </Box>
        </ConfirmCancelModal>
    );
};
const EditMixModal = makeFullModal(
    EditInterventionMixModal,
    EditInterventionMixButton,
);

export { EditMixModal as EditInterventionMix };
