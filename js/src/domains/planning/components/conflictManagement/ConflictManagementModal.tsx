import React, { useCallback, useMemo, useState } from 'react';
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
    onCancel: () => void;
    onApply: (conflictResolution: { [orgUnitId: number]: number[] }) => void;
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
        gap: 1,
        paddingBottom: 1,
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
    onApply,
}) => {
    const { formatMessage } = useSafeIntl();
    const [conflictResolution, setConflictResolution] = useState<{
        [orgUnitId: number]: number[];
    }>({});

    const handleInterventionSelectionChange = useCallback(
        (orgUnitId, selectedInterventions: number[]) => {
            setConflictResolution({
                ...conflictResolution,
                [orgUnitId]: selectedInterventions,
            });

            console.log('conflict orgunitId', orgUnitId);
            console.log('conflict selection', selectedInterventions);
            console.log('conflict resolution', {
                ...conflictResolution,
                [orgUnitId]: selectedInterventions,
            });
        },
        [setConflictResolution, conflictResolution],
    );

    const allInterventions = useMemo(() => {
        return conflicts.reduce((acc, conflict) => {
            conflict.interventions.forEach(intervention => {
                if (acc.includes(intervention.id)) return;
                acc.push(intervention.id);
            });

            return acc;
        }, [] as number[]);
    }, [conflicts]);

    const selectAllInterventions = useCallback(
        interventionId => {
            const resolution = conflicts.reduce(
                (acc, conflict) => {
                    const existingResolutionForOrgUnit =
                        conflictResolution[conflict.orgUnit.id] ?? [];
                    acc[conflict.orgUnit.id] = [
                        ...existingResolutionForOrgUnit,
                        interventionId,
                    ];
                    return acc;
                },
                {} as { [orgUnitId: number]: number[] },
            );

            setConflictResolution(resolution);
        },
        [conflicts, conflictResolution, setConflictResolution],
    );

    const Buttons = useCallback(() => {
        return (
            <Box sx={styles.dialogButtonContainer}>
                <Button onClick={closeDialog}>
                    {formatMessage(MESSAGES.cancel)}
                </Button>
                <Button
                    onClick={() => onApply(conflictResolution)}
                    color="primary"
                    variant="contained"
                >
                    {formatMessage(MESSAGES.apply)}
                </Button>
            </Box>
        );
    }, [formatMessage, closeDialog, onApply, conflictResolution]);

    return (
        <SimpleModal
            titleMessage=""
            id={'conflict-resolution-modal'}
            open={isOpen}
            maxWidth="sm"
            onClose={() => null}
            dataTestId={'conflict-resolution-modal'}
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
                {allInterventions.map(interventionId => (
                    <Button
                        key={interventionId}
                        variant="text"
                        onClick={() => selectAllInterventions(interventionId)}
                    >
                        {formatMessage(MESSAGES.selectAll)}
                    </Button>
                ))}
            </Box>
            <Divider />
            {conflicts
                .filter(c => c.isConflicting)
                .map(c => (
                    <React.Fragment key={c.orgUnit.id}>
                        <ConflictManagementRow
                            conflict={c}
                            selectedInterventionIds={
                                conflictResolution[c.orgUnit.id] || []
                            }
                            onSelectionChange={selectedInterventions =>
                                handleInterventionSelectionChange(
                                    c.orgUnit.id,
                                    selectedInterventions,
                                )
                            }
                        />
                        <Divider />
                    </React.Fragment>
                ))}
        </SimpleModal>
    );
};

const modal = makeFullModal(
    ConflictManagementModal,
    ApplyInterventionAssignmentsButton,
);

export { modal as ConflictManagementModal };
