import { makeFullModal, SimpleModal, useSafeIntl } from 'bluesquare-components';
import React from 'react';
import { FC } from 'react';
import { MESSAGES } from '../../../messages';
import { Box, Button, Theme, Typography } from '@mui/material';
import { ArrowForward } from '@mui/icons-material';
import { SxStyles } from 'Iaso/types/general';

type Props = {
    isOpen: boolean;
    closeDialog: () => void;
};

type ApplyButtonProps = {
    onClick: () => void;
    disabled: boolean;
};
const styles: SxStyles = {
    applyButton: {
        fontSize: '0.875rem',
        textTransform: 'none',
    },
    dialogButtonContainer: (theme: Theme) => ({
        display: 'flex',
        padding: theme.spacing(2),
        justifyContent: 'space-between',
        alignItems: 'center',
        alignSelf: 'stretch',
        width: '100%',
    }),
    modalTitle: (theme: Theme) => ({
        fontWeight: theme.typography.fontWeightMedium,
        paddingBottom: theme.spacing(2),
    }),
    descriptionText: (theme: Theme) => ({
        fontSize: '0.875rem',
        paddingY: theme.spacing(2),
        whiteSpace: 'pre-line',
    }),
};

const ApplyInterventionAssignmentsButton: FC<ApplyButtonProps> = ({
    onClick,
    disabled = false,
}) => {
    const { formatMessage } = useSafeIntl();
    return (
        <Button
            onClick={onClick}
            variant="contained"
            color="primary"
            sx={styles.applyButton}
            endIcon={<ArrowForward />}
            disabled={disabled}
        >
            {formatMessage(MESSAGES.addToPlan)}
        </Button>
    );
};

const ConflictManagementModal: FC<Props> = ({
    isOpen = false,
    closeDialog,
}) => {
    const { formatMessage } = useSafeIntl();

    const Buttons = ({ closeDialog: close }) => {
        return (
            <Box sx={styles.dialogButtonContainer}>
                <Button>{formatMessage(MESSAGES.cancel)}</Button>
                <Button color="primary" variant="contained">
                    {formatMessage(MESSAGES.apply)}
                </Button>
            </Box>
        );
    };

    return (
        <SimpleModal
            titleMessage=""
            id={''}
            open={isOpen}
            maxWidth="sm"
            onClose={() => null}
            dataTestId={''}
            closeDialog={closeDialog}
            buttons={Buttons}
        >
            <Typography sx={styles.modalTitle}>
                {formatMessage(MESSAGES.resolveConflictTitle)}
            </Typography>
            <Typography sx={styles.descriptionText}>
                {formatMessage(MESSAGES.resolveConflictDesc, { br: <br /> })}
            </Typography>
        </SimpleModal>
    );
};

const modal = makeFullModal(
    ConflictManagementModal,
    ApplyInterventionAssignmentsButton,
);

export { modal as ConflictManagementModal };
