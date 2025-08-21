import React, { FC, useCallback, useMemo } from 'react';
import { Box, Button, Divider, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../messages';
import { InterventionAssignmentConflict } from '../../libs/intervention-assignment-utils';
import { InterventionCategory } from '../../types/interventions';
import { ConflictManagementRow } from './ConflictManagementRow';

type Props = {
    interventionCategory: InterventionCategory;
    conflicts: InterventionAssignmentConflict[];
    selectedInterventionIds: { [orgUnitId: number]: number[] };
    handleInterventionSelectionChange: (
        categoryId: number,
        selection: { [orgUnitId: number]: number[] },
    ) => void;
};

const styles: SxStyles = {
    actionsContainer: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 1,
        paddingBottom: 1,
    },
    categoryName: {
        fontSize: '0.75rem',
        margin: 1,
        marginBottom: 0.5,
        flexGrow: 1,
    },
};

export const ConflictManagementCategory: FC<Props> = ({
    interventionCategory,
    conflicts,
    selectedInterventionIds,
    handleInterventionSelectionChange,
}) => {
    const { formatMessage } = useSafeIntl();

    const conflictingInterventions = useMemo(() => {
        return conflicts
            .flatMap(c => c.interventions.map(i => i.id))
            .filter((value, index, self) => self.indexOf(value) === index);
    }, [conflicts]);

    const allSelected = useMemo(() => {
        return conflictingInterventions.reduce(
            (acc, interventionId) => {
                acc[interventionId] = !conflicts.some(c => {
                    const resolution = selectedInterventionIds[c.orgUnit.id];
                    return !resolution || !resolution.includes(interventionId);
                });
                return acc;
            },
            {} as { [interventionId: number]: boolean },
        );
    }, [conflictingInterventions, conflicts, selectedInterventionIds]);

    const toggleAllInterventions = useCallback(
        interventionId => {
            const resolution = conflicts.reduce(
                (acc, conflict) => {
                    const existingResolutionForOrgUnit =
                        selectedInterventionIds[conflict.orgUnit.id] ?? [];
                    acc[conflict.orgUnit.id] = allSelected[interventionId]
                        ? existingResolutionForOrgUnit.filter(
                              id => id !== interventionId,
                          )
                        : [...existingResolutionForOrgUnit, interventionId];
                    return acc;
                },
                {} as { [orgUnitId: number]: number[] },
            );
            handleInterventionSelectionChange(
                interventionCategory.id,
                resolution,
            );
        },
        [
            allSelected,
            conflicts,
            selectedInterventionIds,
            handleInterventionSelectionChange,
            interventionCategory,
        ],
    );

    return (
        <Box sx={{ marginBottom: 2 }}>
            <Box sx={styles.actionsContainer}>
                <Typography sx={styles.categoryName}>
                    {interventionCategory.name}
                </Typography>
                {conflicts.length > 1 &&
                    conflictingInterventions.map(interventionId => (
                        <Button
                            key={interventionId}
                            variant="text"
                            onClick={() =>
                                toggleAllInterventions(interventionId)
                            }
                        >
                            {allSelected[interventionId]
                                ? formatMessage(MESSAGES.unselectAll)
                                : formatMessage(MESSAGES.selectAll)}
                        </Button>
                    ))}
            </Box>
            <Divider />
            {conflicts.map((c, index) => (
                <React.Fragment key={c.orgUnit.id}>
                    <ConflictManagementRow
                        conflict={c}
                        onSelectionChange={selectedInterventions =>
                            handleInterventionSelectionChange(
                                interventionCategory.id,
                                { [c.orgUnit.id]: selectedInterventions },
                            )
                        }
                        selectedInterventionIds={
                            selectedInterventionIds[c.orgUnit.id] || []
                        }
                    />
                    {index < conflicts.length - 1 && <Divider />}
                </React.Fragment>
            ))}
        </Box>
    );
};
