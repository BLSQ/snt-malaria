import React, {
    FunctionComponent,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { Box, Button, Theme, Tooltip } from '@mui/material';
import { LoadingSpinner, useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { InterventionSelect } from '../../../../components/InterventionSelect';
import { Map as SNTMap } from '../../../../components/Map';
import { MapActionBox } from '../../../../components/MapActionBox';
import { MESSAGES } from '../../../messages';
import { useCreateInterventionAssignment } from '../../hooks/useCreateInterventionAssignment';
import { useGetInterventionAssignments } from '../../hooks/useGetInterventionAssignments';
import { useGetOrgUnits } from '../../hooks/useGetOrgUnits';
import { useRemoveOrgUnitFromInterventionPlan } from '../../hooks/useRemoveOrgUnitFromInterventionPlan';
import { defaultLegend, getColorRange, getRandomColor, purples } from '../../libs/color-utils';
import {
    Intervention,
    InterventionOrgUnit,
    InterventionPlan,
} from '../../types/interventions';

// TODO: Update button placeholder when design is ready
// TODO: Select place holder
// TODO: Add selected org units and a clear all
// TODO: Add a cancel button ?
// TODO: Save batch

const defaultLegendConfig = {
    units: '',
    legend_type: 'ordinal', // 'linear' | 'ordinal' | 'threshold';
    legend_config: {
        domain: [],
        range: [],
    },
    unit_symbol: '',
};

interface InterventionColorMap {
    color: string;
    interventionsKey: string;
    label: string;
    orgUnitIds: number[];
}

type Props = {
    scenarioId: number | undefined;
    disabled?: boolean;
    interventions: Intervention[];
};

const styles: SxStyles = {
    mainBox: (theme: Theme) => ({
        borderRadius: theme.spacing(2),
        overflow: 'hidden',
        position: 'relative',
    }),
    customizeButton: {
        marginRight: 1,
        '&.MuiButton-outlined': {
            borderColor: 'white',
            backgroundColor: 'white',
        },
    },
};

const getInterventionsGroupKey = (interventions: Intervention[]) => {
    return interventions.map(i => i.id).join('--');
};

const getInterventionsGroupLabel = (interventions: Intervention[]) => {
    return interventions.map(i => i.name).join(' + ');
};

export const InterventionsPlanMap: FunctionComponent<Props> = ({
    scenarioId,
    disabled = false,
    interventions = [],
}) => {
    const { formatMessage } = useSafeIntl();
    const { data: orgUnits, isLoading: loadingOrgUnits } = useGetOrgUnits();
    const [editMode, setEditMode] = useState<boolean>(false);
    const [selectedOrgUnits, setSelectedOrgUnits] = useState<number[]>([]);
    const [selectedInterventionId, setSelectedInterventionId] = useState<
        number | null
    >(null);
    const {
        data: interventionAssignments,
        isLoading: isLoadinginterventionAssignments,
    } = useGetInterventionAssignments(scenarioId);

    const [localInterventionAssignments, setLocalInterventionAssignments] =
        useState<InterventionPlan[]>(interventionAssignments || []);
    const interventionIds = useMemo(
        () => interventions.map(i => i.id),
        [interventions],
    );


    // const { mutateAsync: removeOrgUnitsFromIntervention } =
    //     useRemoveOrgUnitFromInterventionPlan({ showSuccessSnackBar: false });
    // const { mutateAsync: createInterventionAssignment } =
    //     useCreateInterventionAssignment();



    // useEffect(() => {
    //     if (
    //         interventions && interventions.length > 0 &&
    //         interventionAssignments?.some(
    //             i => i.intervention.id === selectedInterventionId,
    //         )
    //     )
    //         return;

    //     const defaultId =
    //         interventionAssignments && interventionAssignments.length === 1
    //             ? interventionAssignments[0].intervention?.id
    //             : 0;
    //     setSelectedInterventionId(defaultId);
    // }, [
    //     interventionAssignments,
    //     selectedInterventionId,
    //     setSelectedInterventionId,
    // ]);

    // Helper to map org unit IDs to their interventions
    const getOrgUnitInterventions = (plans: InterventionPlan[]) => {
        return plans.reduce((acc, plan) => {
            plan.org_units.forEach(orgUnit => {
                const mapInterventions = acc.get(orgUnit.id) ?? [];
                mapInterventions.push(plan.intervention);
                acc.set(orgUnit.id, mapInterventions);
            });
            return acc;
        }, new Map<number, Intervention[]>());
    };

    const orgUnitInterventions = useMemo(() => {
        if (isLoadinginterventionAssignments)
            return new Map<number, Intervention[]>();
        const ouInterventions = getOrgUnitInterventions(
            localInterventionAssignments ?? [],
        );
        return ouInterventions;
    }, [localInterventionAssignments, isLoadinginterventionAssignments]);

    useEffect(
        () => setLocalInterventionAssignments(interventionAssignments || []),
        [interventionAssignments],
    );

    useEffect(() => {
        if (editMode === false) {
            setSelectedOrgUnits([]);
        }
    }, [editMode]);

    // Get OrgUnits relevant to the selected interventions
    const highlightedOrgUnits = useMemo(
        () =>
            interventionIds && interventionIds.length > 0
                ? [...orgUnitInterventions]
                      .filter(([_ouId, ouInterventions]) =>
                          ouInterventions.some(i =>
                              interventionIds.includes(i.id),
                          ),
                      )
                      .map(([ouId, _interventions]) => ouId)
                : [...orgUnitInterventions.keys()],
        [interventionIds, orgUnitInterventions],
    );

    const interventionGroupColors = useMemo(() => {
        const groupMap = new Map<string, InterventionColorMap>();

        for (const [ouId, interventions] of orgUnitInterventions) {
            const key = getInterventionsGroupKey(interventions);
            if (!groupMap.has(key)) {
                groupMap.set(key, {
                    interventionsKey: key,
                    color: getRandomColor(key),
                    label: getInterventionsGroupLabel(interventions),
                    orgUnitIds: [],
                });
            }
            groupMap.get(key)!.orgUnitIds.push(ouId);
        }

        const colorMap = Array.from(groupMap.values());

        return colorMap;
    }, [orgUnitInterventions]);

    const getOrgUnitMapMisc = useCallback(
        (orgUnitId: number) => {
            if (!highlightedOrgUnits.includes(orgUnitId)) {
                return { color: defaultLegend, label: '' };
            }

            if (interventionIds && interventionIds.length > 0) {
                const ouInterventions = orgUnitInterventions
                    .get(orgUnitId)
                    ?.filter(i => interventionIds.includes(i.id));
                const uniqueIntervention =
                    ouInterventions?.length === 1 ? ouInterventions[0] : null;
                const interventionIndex = interventionIds.indexOf(
                    uniqueIntervention?.id ?? 0,
                );
                return {
                    color: purples[interventionIndex],
                    label: uniqueIntervention?.name ?? '',
                };
            }

            const { color, label } =
                interventionGroupColors.find(x =>
                    x.orgUnitIds.includes(orgUnitId),
                ) ?? {};
            return { color, label };
        },
        [
            highlightedOrgUnits,
            interventionGroupColors,
            interventionIds,
            orgUnitInterventions,
        ],
    );

    const legendConfig = useMemo(() => {
        const domain: string[] = [];
        const range: string[] = [];

        if (interventions && interventions.length > 0) {
            interventions.forEach((intervention, index) => {
                domain.push(intervention?.name || '');
                range.push(purples[index]);
            });
        } else {
            interventionGroupColors.forEach(v => {
                range.push(v.color);
                domain.push(v.label);
            });
        }
        return { ...defaultLegendConfig, legend_config: { domain, range } };
    }, [interventionGroupColors, interventions]);

    // const removeAssignment = useCallback(
    //     async (orgUnitId: number, assignmentId: number) => {
    //         await removeOrgUnitsFromIntervention(assignmentId);
    //         const updatedAssignments = localInterventionAssignments?.map(
    //             plan => {
    //                 if (plan.intervention.id !== selectedInterventionId) {
    //                     return plan;
    //                 }
    //                 return {
    //                     ...plan,
    //                     org_units: plan.org_units.filter(
    //                         ou => ou.id !== orgUnitId,
    //                     ),
    //                 };
    //             },
    //         );
    //         setLocalInterventionAssignments(updatedAssignments || []);
    //     },
    //     [
    //         selectedInterventionId,
    //         localInterventionAssignments,
    //         removeOrgUnitsFromIntervention,
    //     ],
    // );

    // const addAssigment = useCallback(
    //     async (orgUnitId: number, scenarioId?: number) => {
    //         const ouInterventions = orgUnitInterventions.get(orgUnitId) || [];

    //         await createInterventionAssignment({
    //             scenario_id: scenarioId!,
    //             orgunit_interventions: {
    //                 [orgUnitId]: [
    //                     ...ouInterventions.map(i => i.id),
    //                     selectedInterventionId,
    //                 ],
    //             },
    //         });
    //         const updatedAssignments = localInterventionAssignments?.map(
    //             plan => {
    //                 if (plan.intervention.id !== selectedInterventionId) {
    //                     return plan;
    //                 }
    //                 return {
    //                     ...plan,
    //                     org_units: [
    //                         ...plan.org_units,
    //                         {
    //                             id: orgUnitId,
    //                             name:
    //                                 orgUnits?.find(ou => ou.id === orgUnitId)
    //                                     ?.name || '',
    //                             intervention_assignment_id: 0,
    //                         } as InterventionOrgUnit,
    //                     ],
    //                 };
    //             },
    //         );
    //         setLocalInterventionAssignments(updatedAssignments || []);
    //     },
    //     [
    //         createInterventionAssignment,
    //         orgUnitInterventions,
    //         selectedInterventionId,
    //         localInterventionAssignments,
    //         orgUnits,
    //     ],
    // );
    const onOrgUnitClick = useCallback(
        (orgUnitId: number) => {
            if (
                disabled ||
                !editMode ||
                !interventions ||
                interventions.length === 0
            ) {
                return;
            }

            if (selectedOrgUnits.includes(orgUnitId)) {
                setSelectedOrgUnits(
                    selectedOrgUnits.filter(id => id !== orgUnitId),
                );
            } else {
                setSelectedOrgUnits([...selectedOrgUnits, orgUnitId]);
            }
        },
        [
            editMode,
            disabled,
            interventions,
            setSelectedOrgUnits,
            selectedOrgUnits,
        ],
    );

    if (loadingOrgUnits)
        return (
            <Box height="100%" width="100%" sx={styles.mainBox}>
                <LoadingSpinner absolute />;
            </Box>
        );

    return (
        <Box height="100%" width="100%" sx={styles.mainBox}>
            {orgUnits && (
                <SNTMap
                    id="intervention_plan_map"
                    orgUnits={orgUnits}
                    selectedOrgUnits={selectedOrgUnits}
                    getOrgUnitMapMisc={getOrgUnitMapMisc}
                    onOrgUnitClick={onOrgUnitClick}
                    legendConfig={legendConfig}
                    hideLegend={
                        !localInterventionAssignments ||
                        localInterventionAssignments.length <= 0
                    }
                />
            )}

            <MapActionBox>
                {editMode && (
                    <InterventionSelect
                        onInterventionSelect={setSelectedInterventionId}
                        interventions={interventions}
                        showNoneOption={true}
                        showAllOption={false}
                        selectedInterventionId={selectedInterventionId}
                    />
                )}
                {disabled || interventions.length === 0 ? null : (
                    <Tooltip title={formatMessage(MESSAGES.customizeTooltip)}>
                        <Button
                            variant={editMode ? 'contained' : 'outlined'}
                            onClick={() => setEditMode(!editMode)}
                            sx={styles.customizeButton}
                        >
                            {formatMessage(
                                editMode ? MESSAGES.ok : MESSAGES.customize,
                            )}
                        </Button>
                    </Tooltip>
                )}
            </MapActionBox>
        </Box>
    );
};
