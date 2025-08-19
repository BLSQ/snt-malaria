import React, { useCallback, useMemo, useState } from 'react';
import { FC } from 'react';
import { ArrowForward } from '@mui/icons-material';
import { Box, Button, Divider, Theme, Typography } from '@mui/material';
import { makeFullModal, SimpleModal, useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../messages';
import { InterventionAssignmentConflict } from '../../libs/intervention-assignment-utils';
import { ConflictManagementCategory } from './ConflictManagementCategory';
import { flatten } from 'lodash';

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
        [categoryId: number]: { [orgUnitId: number]: number[] };
    }>({});

    const conflictingConflicts = useMemo(() => {
        return conflicts.filter(conflict => conflict.isConflicting);
    }, [conflicts]);

    const categoryConflicts = useMemo(() => {
        return conflictingConflicts.reduce(
            (acc, conflict) => {
                const categoryId = conflict.categoryId;
                if (!acc[categoryId]) {
                    acc[categoryId] = [];
                }
                acc[categoryId].push(conflict);
                return acc;
            },
            {} as { [categoryId: number]: InterventionAssignmentConflict[] },
        );
    }, [conflictingConflicts]);

    const handleInterventionSelectionChange = useCallback(
        (categoryId, orgUnitId, selectedInterventions: number[]) => {
            const newState = {
                ...conflictResolution,
                [categoryId]: {
                    ...conflictResolution[categoryId],
                    [orgUnitId]: selectedInterventions,
                },
            };

            setConflictResolution(newState);
        },
        [setConflictResolution, conflictResolution],
    );

    const applyChanges = useCallback(() => {
        const resolution = conflicts.reduce(
            (acc, conflict) => {
                const assignmentsToAdd = conflict.isConflicting
                    ? (conflictResolution[conflict.categoryId]?.[
                          conflict.orgUnit.id
                      ] ?? [])
                    : conflict.interventions.map(i => i.id);

                acc[conflict.orgUnit.id] = [
                    ...(acc[conflict.orgUnit.id] ?? []),
                    ...assignmentsToAdd,
                ];
                return acc;
            },
            {} as { [orgUnitId: number]: number[] },
        );

        onApply(resolution);
    }, [conflicts, conflictResolution, onApply]);

    const Buttons = useCallback(() => {
        // TODO Handle disabled of the button.
        return (
            <Box sx={styles.dialogButtonContainer}>
                <Button onClick={closeDialog}>
                    {formatMessage(MESSAGES.cancel)}
                </Button>
                <Button
                    onClick={() => applyChanges()}
                    color="primary"
                    variant="contained"
                >
                    {formatMessage(MESSAGES.apply)}
                </Button>
            </Box>
        );
    }, [formatMessage, closeDialog, applyChanges]);

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
                {/* {conflictingInterventions.map(interventionId => (
                    <Button
                        key={interventionId}
                        variant="text"
                        onClick={() => toggleAllInterventions(interventionId)}
                    >
                        {allSelected[interventionId]
                            ? formatMessage(MESSAGES.unselectAll)
                            : formatMessage(MESSAGES.selectAll)}
                    </Button>
                ))} */}
            </Box>
            <Divider />
            {Object.entries(categoryConflicts).map(([categoryId, conflict]) => (
                <ConflictManagementCategory
                    key={categoryId}
                    categoryId={Number(categoryId)}
                    conflicts={conflict}
                    handleInterventionSelectionChange={
                        handleInterventionSelectionChange
                    }
                    selectedInterventionIds={
                        conflictResolution[Number(categoryId)] || []
                    }
                />
            ))}
        </SimpleModal>
    );
};

const modal = makeFullModal(
    ConflictManagementModal,
    ApplyInterventionAssignmentsButton,
);

export { modal as ConflictManagementModal };
