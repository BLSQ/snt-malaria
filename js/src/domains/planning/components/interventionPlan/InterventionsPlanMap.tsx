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
import { defaultLegend, getColorRange } from '../../libs/color-utils';
import {
    Intervention,
    InterventionOrgUnit,
    InterventionPlan,
} from '../../types/interventions';

const defaultLegendConfig = {
    units: '',
    legend_type: 'ordinal', // 'linear' | 'ordinal' | 'threshold';
    legend_config: {
        domain: [],
        range: [],
    },
    unit_symbol: '',
};

const defaultColor = 'var(--deepPurple-300, #9575CD)';

interface InterventionColorMap {
    color: string;
    interventionsKey: string;
    label: string;
    orgUnitIds: number[];
}

type Props = {
    scenarioId: number | undefined;
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

const getSelectedOrgUnitsFromId = (
    selectedId: number,
    orgUnitInterventions: Map<number, Intervention[]>,
) => {
    const filteredOrgUnitIds = [...orgUnitInterventions]
        .filter(([_key, value]) =>
            value.some((v: { id: number }) => v.id === selectedId),
        )
        .map(([key, _value]) => key);

    return filteredOrgUnitIds;
};

const getInterventionsGroupKey = (interventions: Intervention[]) => {
    return interventions.map(i => i.id).join('--');
};

const getInterventionsGroupLabel = (interventions: Intervention[]) => {
    return interventions.map(i => i.name).join(' + ');
};

export const InterventionsPlanMap: FunctionComponent<Props> = ({
    scenarioId,
}) => {
    const { formatMessage } = useSafeIntl();
    const { data: orgUnits, isLoading: loadingOrgUnits } = useGetOrgUnits();
    const [editMode, setEditMode] = useState<boolean>(false);
    const { mutateAsync: removeOrgUnitsFromIntervention } =
        useRemoveOrgUnitFromInterventionPlan({ showSuccessSnackBar: false });
    const { mutateAsync: createInterventionAssignment } =
        useCreateInterventionAssignment();

    const {
        data: interventionAssignments,
        isLoading: isLoadinginterventionAssignments,
    } = useGetInterventionAssignments(scenarioId);

    const [selectedInterventionId, setSelectedInterventionId] = useState<
        number | null
    >(null);

    useEffect(() => {
        if (
            selectedInterventionId &&
            interventionAssignments?.some(
                i => i.intervention.id === selectedInterventionId,
            )
        )
            return;

        const defaultId =
            interventionAssignments && interventionAssignments.length === 1
                ? interventionAssignments[0].intervention?.id
                : 0;
        setSelectedInterventionId(defaultId);
    }, [
        interventionAssignments,
        selectedInterventionId,
        setSelectedInterventionId,
    ]);

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

    const [localInterventionAssignments, setLocalInterventionAssignments] =
        useState<InterventionPlan[]>(interventionAssignments || []);

    useEffect(
        () => setLocalInterventionAssignments(interventionAssignments || []),
        [interventionAssignments],
    );

    const orgUnitInterventions = useMemo(() => {
        if (isLoadinginterventionAssignments)
            return new Map<number, Intervention[]>();
        const ouInterventions = getOrgUnitInterventions(
            localInterventionAssignments ?? [],
        );
        return ouInterventions;
    }, [localInterventionAssignments, isLoadinginterventionAssignments]);

    const highlightedOrgUnits = useMemo(
        () =>
            selectedInterventionId
                ? getSelectedOrgUnitsFromId(
                      selectedInterventionId,
                      orgUnitInterventions,
                  )
                : [...orgUnitInterventions.keys()],
        [selectedInterventionId, orgUnitInterventions],
    );

    const interventionGroupColors = useMemo(() => {
        const colorMap = [...orgUnitInterventions].reduce(
            (acc, [key, interventions]) => {
                const interventionGroupKey =
                    getInterventionsGroupKey(interventions);

                // We don't want to generate new color if one was already assigned for this group.
                const existingMap = acc.find(
                    c => c.interventionsKey === interventionGroupKey,
                );
                if (existingMap) {
                    existingMap.orgUnitIds.push(key);
                    return acc;
                }

                return [
                    ...acc,
                    {
                        interventionsKey: interventionGroupKey,
                        color: defaultLegend,
                        label: getInterventionsGroupLabel(interventions),
                        orgUnitIds: [key],
                    },
                ];
            },
            [] as InterventionColorMap[],
        );

        getColorRange(colorMap.length).forEach((c, index) => {
            colorMap[index].color = c;
        });

        return colorMap;
    }, [orgUnitInterventions]);

    const getOrgUnitMapMisc = useCallback(
        orgUnitId => {
            if (!highlightedOrgUnits.includes(orgUnitId)) {
                return { color: defaultLegend, label: '' };
            }

            if (selectedInterventionId) {
                return { color: defaultColor, label: '' };
            }

            const { color, label } =
                interventionGroupColors.find(x =>
                    x.orgUnitIds.includes(orgUnitId),
                ) ?? {};
            return { color, label };
        },
        [interventionGroupColors, highlightedOrgUnits, selectedInterventionId],
    );

    const legendConfig = useMemo(() => {
        const domain: string[] = [];
        const range: string[] = [];
        interventionGroupColors.forEach(v => {
            range.push(v.color);
            domain.push(v.label);
        });
        return { ...defaultLegendConfig, legend_config: { domain, range } };
    }, [interventionGroupColors]);

    const removeAssignment = useCallback(
        async (orgUnitId: number, assignmentId: number) => {
            await removeOrgUnitsFromIntervention(assignmentId);
            const updatedAssignments = localInterventionAssignments?.map(
                plan => {
                    if (plan.intervention.id !== selectedInterventionId) {
                        return plan;
                    }
                    return {
                        ...plan,
                        org_units: plan.org_units.filter(
                            ou => ou.id !== orgUnitId,
                        ),
                    };
                },
            );
            setLocalInterventionAssignments(updatedAssignments || []);
        },
        [
            selectedInterventionId,
            localInterventionAssignments,
            removeOrgUnitsFromIntervention,
        ],
    );

    const addAssigment = useCallback(
        async (orgUnitId: number, scenarioId?: number) => {
            const ouInterventions = orgUnitInterventions.get(orgUnitId) || [];

            await createInterventionAssignment({
                scenario_id: scenarioId!,
                orgunit_interventions: {
                    [orgUnitId]: [
                        ...ouInterventions.map(i => i.id),
                        selectedInterventionId,
                    ],
                },
            });
            const updatedAssignments = localInterventionAssignments?.map(
                plan => {
                    if (plan.intervention.id !== selectedInterventionId) {
                        return plan;
                    }
                    return {
                        ...plan,
                        org_units: [
                            ...plan.org_units,
                            {
                                id: orgUnitId,
                                name:
                                    orgUnits?.find(ou => ou.id === orgUnitId)
                                        ?.name || '',
                                intervention_assignment_id: 0,
                            } as InterventionOrgUnit,
                        ],
                    };
                },
            );
            setLocalInterventionAssignments(updatedAssignments || []);
        },
        [
            createInterventionAssignment,
            orgUnitInterventions,
            selectedInterventionId,
            localInterventionAssignments,
            orgUnits,
        ],
    );
    const onOrgUnitClick = useCallback(
        orgUnitId => {
            if (!editMode || !selectedInterventionId) {
                return;
            }

            const existingAssignment = localInterventionAssignments
                ?.find(plan => plan.intervention.id === selectedInterventionId)
                ?.org_units.find(ou => ou.id === orgUnitId);
            if (existingAssignment) {
                removeAssignment(
                    orgUnitId,
                    existingAssignment.intervention_assignment_id,
                );
            } else {
                addAssigment(orgUnitId, scenarioId);
            }
        },
        [
            editMode,
            selectedInterventionId,
            localInterventionAssignments,
            removeAssignment,
            addAssigment,
            scenarioId,
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
                    getOrgUnitMapMisc={getOrgUnitMapMisc}
                    onOrgUnitClick={onOrgUnitClick}
                    legendConfig={legendConfig}
                    hideLegend={
                        !!selectedInterventionId ||
                        !localInterventionAssignments ||
                        localInterventionAssignments.length <= 0
                    }
                />
            )}

            <MapActionBox>
                <InterventionSelect
                    onInterventionSelect={setSelectedInterventionId}
                    interventions={localInterventionAssignments?.map(
                        ({ intervention }) => intervention,
                    )}
                    selectedInterventionId={selectedInterventionId}
                />
                <Tooltip title={formatMessage(MESSAGES.customizeTooltip)}>
                    <Button
                        variant={editMode ? 'contained' : 'outlined'}
                        onClick={() => setEditMode(!editMode)}
                        sx={styles.customizeButton}
                    >
                        {formatMessage(MESSAGES.customize)}
                    </Button>
                </Tooltip>
            </MapActionBox>
        </Box>
    );
};
