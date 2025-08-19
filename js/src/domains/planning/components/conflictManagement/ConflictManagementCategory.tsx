import React, { FC } from 'react';
import { Divider } from '@mui/material';
import { InterventionAssignmentConflict } from '../../libs/intervention-assignment-utils';
import { ConflictManagementRow } from './ConflictManagementRow';

type Props = {
    categoryId: number;
    conflicts: InterventionAssignmentConflict[];
    selectedInterventionIds: { [orgUnitId: number]: number[] };
    handleInterventionSelectionChange: (
        categoryId: number,
        orgUnitId: number,
        selectedInterventions: number[],
    ) => void;
};

export const ConflictManagementCategory: FC<Props> = ({
    categoryId,
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
        <>
            {conflicts.map(c => (
                <React.Fragment key={c.orgUnit.id}>
                    <ConflictManagementRow
                        conflict={c}
                        onSelectionChange={selectedInterventions =>
                            handleInterventionSelectionChange(
                                categoryId,
                                c.orgUnit.id,
                                selectedInterventions,
                            )
                        }
                        selectedInterventionIds={
                            selectedInterventionIds[c.orgUnit.id] || []
                        }
                    />
                    <Divider />
                </React.Fragment>
            ))}
        </>
    );
};
