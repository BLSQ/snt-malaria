import React, { useCallback, useMemo } from 'react';
import { FC } from 'react';
import { ArrowForward } from '@mui/icons-material';
import { Box, Button, Divider, Theme, Typography } from '@mui/material';
import { makeFullModal, SimpleModal, useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../messages';
import { InterventionAssignmentConflict } from '../../libs/intervention-assignment-utils';
import { ConflictManagementRow } from './ConflictManagementRow';

type Props = {
    isOpen: boolean;
    closeDialog: () => void;
    conflicts: InterventionAssignmentConflict[];
};

type ApplyButtonProps = {
    onClick: () => void;
    beforeOnClick: () => boolean;
    disabled: boolean;
};
const styles: SxStyles = {
    applyButton: {
        fontSize: '0.875rem',
        textTransform: 'none',
    },
    actionsContainer: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'flex-end',
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
    beforeOnClick,
    disabled = false,
}) => {
    const { formatMessage } = useSafeIntl();

    const handleOnClick = useCallback(() => {
        if (beforeOnClick()) {
            onClick();
        }
    }, [beforeOnClick, onClick]);

    return (
        <Button
            onClick={handleOnClick}
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
    conflicts,
}) => {
    const { formatMessage } = useSafeIntl();
    const handleInterventionSelectionChange = useCallback(
        (conflict, selectedInterventions) => {
            console.log('conflict', conflict);
            console.log('conflict selection', selectedInterventions);
        },
        [],
    );

    const Buttons = useCallback(
        ({ closeDialog: close }) => {
            return (
                <Box sx={styles.dialogButtonContainer}>
                    <Button>{formatMessage(MESSAGES.cancel)}</Button>
                    <Button color="primary" variant="contained">
                        {formatMessage(MESSAGES.apply)}
                    </Button>
                </Box>
            );
        },
        [formatMessage],
    );

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
            <Box sx={styles.actionsContainer}>
                <Button variant="text">Select all</Button>
                <Button variant="text">Select all</Button>
            </Box>
            <Divider />
            {conflicts.map(c => (
                <>
                    <ConflictManagementRow
                        conflict={c}
                        onSelectionChange={selectedInterventions =>
                            handleInterventionSelectionChange(
                                c,
                                selectedInterventions,
                            )
                        }
                    />
                    <Divider />
                </>
            ))}
        </SimpleModal>
    );
};

const modal = makeFullModal(
    ConflictManagementModal,
    ApplyInterventionAssignmentsButton,
);

export { modal as ConflictManagementModal };
