import React, { FunctionComponent, useEffect, useMemo } from 'react';
import { Box, Button } from '@mui/material';
import {
    ConfirmCancelModal,
    makeFullModal,
    useSafeIntl,
} from 'bluesquare-components';
import { UseDeleteIntervenetionMix } from '../../hooks/UseDeleteInterventionMix';
import { UseUpdateInterventionMix } from '../../hooks/UseUpdateInterventionMix';
import { MESSAGES } from '../../messages';
import { InterventionCategories } from '../interventionMix/InterventionCategories';
import { ConfirmButtonStyles } from './ConfirmButtonStyles';
import { EditInterventionMixButton } from './EditInterventionMixButton';

type Props = {
    isOpen: boolean;
    closeDialog: () => void;
    mix: any;
    setHoveredMixName: (status: boolean) => void;
    setSelectedInterventions: React.Dispatch<
        React.SetStateAction<Record<number, number[]>>
    >;
    selectedInterventions: any;
    mixName: string;
    setMixName: (name: string) => void;
};
const EditInterventionMixModal: FunctionComponent<Props> = ({
    isOpen,
    closeDialog,
    mix,
    setHoveredMixName,
    setSelectedInterventions,
    selectedInterventions,
    mixName,
    setMixName,
}) => {
    const { formatMessage } = useSafeIntl();
    useEffect(() => {
        setMixName(mix.name);
        const newInterventions: Record<number, number[]> = {};
        mix.interventions.forEach(({ intervention_category, id }) => {
            if (!newInterventions[intervention_category]) {
                newInterventions[intervention_category] = [];
            }
            newInterventions[intervention_category].push(id);
        });
        setSelectedInterventions(newInterventions);
    }, [mix.interventions, mix.name, setMixName, setSelectedInterventions]);

    const { mutateAsync: updateInterventionMix } = UseUpdateInterventionMix();
    const { mutateAsync: deleteInterventionMix } = UseDeleteIntervenetionMix();
    const selectedInterventionValues = useMemo(
        () =>
            Object.values(selectedInterventions)
                .flat()
                .filter(value => value !== null),
        [selectedInterventions],
    );
    const handleInterventionMixUpdate = async () => {
        await updateInterventionMix({
            id: mix.id,
            name: mixName,
            intervention_ids: selectedInterventionValues,
        });
        formReset();
    };

    const formReset = () => {
        setMixName('');
        setSelectedInterventions([]);
    };

    const handleInterventionMixDelete = async () => {
        await deleteInterventionMix(mix.id);
    };
    return (
        <>
            <ConfirmCancelModal
                dataTestId="edit-mix-modal"
                id="edit-mix-modal"
                open={isOpen}
                closeDialog={closeDialog}
                onConfirm={() => handleInterventionMixUpdate()}
                onClose={() => setHoveredMixName(false)}
                onCancel={() => formReset()}
                cancelMessage={MESSAGES.cancel}
                confirmMessage={MESSAGES.updateMix}
                titleMessage={formatMessage(MESSAGES.editMixTitle)}
                allowConfirm
                allowConfirmAdditionalButton
            >
                <Box sx={{ ml: '-10px' }}>
                    <InterventionCategories
                        selectedInterventions={selectedInterventions}
                        setSelectedInterventions={setSelectedInterventions}
                        edit
                        mix={mix}
                        mixName={mixName}
                        setMixName={setMixName}
                    />
                    <Box sx={{ position: 'absolute', bottom: 10, left: 20 }}>
                        <Button
                            sx={{
                                color: '#D32F2F',
                                textTransform: 'capitalize',
                                fontWeight: 'bold',
                            }}
                            onClick={() => handleInterventionMixDelete()}
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
