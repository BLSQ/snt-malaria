import React, { FC } from 'react';
import { Box, Divider, Typography } from '@mui/material';
import { InterventionAssignmentConflict } from '../../libs/intervention-assignment-utils';
import { InterventionCategory } from '../../types/interventions';
import { ConflictManagementRow } from './ConflictManagementRow';

type Props = {
    interventionCategory: InterventionCategory;
    conflicts: InterventionAssignmentConflict[];
    selectedInterventionIds: { [orgUnitId: number]: number[] };
    handleInterventionSelectionChange: (
        categoryId: number,
        orgUnitId: number,
        selectedInterventions: number[],
    ) => void;
};

export const ConflictManagementCategory: FC<Props> = ({
    interventionCategory,
    conflicts,
    selectedInterventionIds,
    handleInterventionSelectionChange,
}) => {
    // const conflictingInterventions = useMemo(() => {
    //     return conflicts.reduce((acc, conflict) => {
    //         conflict.interventions.forEach(intervention => {
    //             if (acc.includes(intervention.id)) return;
    //             if (conflict.isConflicting) {
    //                 acc.push(intervention.id);
    //             }
    //         });
    //         return acc;
    //     }, [] as number[]);
    // }, [conflicts]);

    // const allSelectedPerCategory = useMemo(() => {
    //     return conflictingInterventions.reduce(
    //         (acc, interventionId) => {
    //             acc[interventionId] = !conflicts.some(c => {
    //                 const resolution = conflictResolution[c.orgUnit.id];
    //                 return !resolution || !resolution.includes(interventionId);
    //             });

    //             return acc;
    //         },
    //         {} as { [categoryId: number]: number[] },
    //     );
    // }, [conflicts]);

    // const allSelected = useMemo(() => {
    //     return allInterventions.reduce(
    //         (acc, interventionId) => {
    //             acc[interventionId] = !conflictingConflicts.some(c => {
    //                 const resolution = conflictResolution[c.orgUnit.id];
    //                 return !resolution || !resolution.includes(interventionId);
    //             });
    //             return acc;
    //         },
    //         {} as { [interventionId: number]: boolean },
    //     );
    // }, [allInterventions, conflicts, conflictResolution]);

    // const toggleAllInterventions = useCallback(
    //     interventionId => {
    //         const resolution = conflicts.reduce(
    //             (acc, conflict) => {
    //                 const existingResolutionForOrgUnit =
    //                     conflictResolution[conflict.orgUnit.id] ?? [];
    //                 acc[conflict.orgUnit.id] = allSelected[interventionId]
    //                     ? existingResolutionForOrgUnit.filter(
    //                           id => id !== interventionId,
    //                       )
    //                     : [...existingResolutionForOrgUnit, interventionId];
    //                 return acc;
    //             },
    //             {} as { [orgUnitId: number]: number[] },
    //         );

    //         setConflictResolution(resolution);
    //     },
    //     [conflicts, conflictResolution, setConflictResolution, allSelected],
    // );

    return (
        <Box sx={{ marginBottom: 2 }}>
            <Typography
                sx={{ fontSize: '0.75rem', margin: 1, marginBottom: 0.5 }}
            >
                {interventionCategory.name}
            </Typography>
            <Divider />
            {conflicts.map((c, index) => (
                <React.Fragment key={c.orgUnit.id}>
                    <ConflictManagementRow
                        conflict={c}
                        onSelectionChange={selectedInterventions =>
                            handleInterventionSelectionChange(
                                interventionCategory.id,
                                c.orgUnit.id,
                                selectedInterventions,
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
