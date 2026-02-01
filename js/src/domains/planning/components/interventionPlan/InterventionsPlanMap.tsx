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
import { MapSelectionWidget } from '../../../../components/MapSelectionWidget';
import { LegendTypes } from '../../../../constants/legend';
import { MESSAGES } from '../../../messages';
import { useCreateInterventionAssignment } from '../../hooks/useCreateInterventionAssignment';
import { useGetInterventionAssignments } from '../../hooks/useGetInterventionAssignments';
import { useGetOrgUnits } from '../../hooks/useGetOrgUnits';
import { useRemoveManyOrgUnitsFromInterventionPlan } from '../../hooks/useRemoveOrgUnitFromInterventionPlan';
import { defaultLegend, getRandomColor, purples } from '../../libs/color-utils';
import { Intervention, InterventionPlan } from '../../types/interventions';

const defaultLegendConfig = {
    units: '',
    legend_type: LegendTypes.ORDINAL,
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
    displayOrgUnitId?: number | null;
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
    return interventions.map(i => i.short_name).join(' + ');
};

export const InterventionsPlanMap: FunctionComponent<Props> = ({
    scenarioId,
    disabled = false,
    interventions = [],
    displayOrgUnitId,
}) => {
    const { formatMessage } = useSafeIntl();
    const { data: orgUnits, isLoading: loadingOrgUnits } =
        useGetOrgUnits(displayOrgUnitId);
    const [editMode, setEditMode] = useState<boolean>(false);
    const [selectedOrgUnits, setSelectedOrgUnits] = useState<number[]>([]);
    const [selectedInterventionId, setSelectedInterventionId] = useState<
        number | undefined
    >(undefined);
    const {
        data: interventionAssignments,
        isLoading: isLoadinginterventionAssignments,
    } = useGetInterventionAssignments(scenarioId);
    const { mutateAsync: removeManyOrgUnitsFromPlan } =
        useRemoveManyOrgUnitsFromInterventionPlan();
    const { mutateAsync: createInterventionAssignment } =
        useCreateInterventionAssignment();

    const interventionIds = useMemo(
        () => interventions.map(i => i.id),
        [interventions],
    );

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
            interventionAssignments ?? [],
        );
        return ouInterventions;
    }, [interventionAssignments, isLoadinginterventionAssignments]);

    useEffect(() => {
        if (editMode === false) {
            setSelectedInterventionId(undefined);
            setSelectedOrgUnits([]);
        }
    }, [editMode]);

    useEffect(() => setSelectedInterventionId(undefined), [interventions]);

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
                    label: uniqueIntervention?.short_name ?? '',
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
                domain.push(intervention?.short_name || '');
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

    const invertSelectedOrgUnits = useCallback(() => {
        if (!orgUnits) return;
        const newSelectedOrgUnits = orgUnits
            .map(ou => ou.id)
            .filter(ouId => !selectedOrgUnits.includes(ouId));
        setSelectedOrgUnits(newSelectedOrgUnits);
    }, [orgUnits, selectedOrgUnits]);

    const removeSelectedOrgUnitsFromPlan = useCallback(
        (orgUnitIds: number[]) => {
            const assignmentIds = orgUnitIds
                .map(ouId =>
                    interventionAssignments
                        ?.filter(
                            plan =>
                                interventionIds.includes(
                                    plan.intervention.id,
                                ) && plan.org_units.some(ou => ou.id === ouId),
                        )
                        .map(
                            plan =>
                                plan.org_units.find(ou => ou.id === ouId)
                                    ?.intervention_assignment_id,
                        ),
                )
                .flat();

            removeManyOrgUnitsFromPlan(assignmentIds);
        },
        [removeManyOrgUnitsFromPlan, interventionAssignments, interventionIds],
    );

    const applyInterventionToOrgUnits = useCallback(
        async (
            orgUnitIds: number[],
            targetInterventionId: number | undefined,
        ) => {
            if (orgUnitIds.length === 0 || targetInterventionId === undefined) {
                setEditMode(false);
                setSelectedOrgUnits([]);
                return;
            }

            if (targetInterventionId <= 0) {
                removeSelectedOrgUnitsFromPlan(orgUnitIds);
            } else {
                const orgunitsInterventions = orgUnitIds.reduce(
                    (acc, orgUnitId) => {
                        acc[orgUnitId] = [targetInterventionId];
                        return acc;
                    },
                    {} as { [orgUnitId: number]: number[] },
                );
                createInterventionAssignment({
                    scenario_id: scenarioId!,
                    orgunit_interventions: orgunitsInterventions,
                });
            }

            setSelectedOrgUnits([]);
            setEditMode(false);
            return;
        },
        [
            setSelectedOrgUnits,
            setEditMode,
            removeSelectedOrgUnitsFromPlan,
            createInterventionAssignment,
            scenarioId,
        ],
    );

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
                        !interventionAssignments ||
                        interventionAssignments.length <= 0
                    }
                />
            )}

            <MapActionBox>
                {editMode && (
                    <>
                        <MapSelectionWidget
                            selectedOrgUnits={selectedOrgUnits}
                            onClearAll={() => setSelectedOrgUnits([])}
                            onSelectAll={() =>
                                setSelectedOrgUnits(
                                    orgUnits?.map(orgUnit => orgUnit.id) || [],
                                )
                            }
                            onInvertSelection={invertSelectedOrgUnits}
                            showFilterButton={false}
                            disabled={disabled}
                        />
                        <InterventionSelect
                            onInterventionSelect={setSelectedInterventionId}
                            interventions={interventions}
                            showNoneOption={true}
                            showAllOption={false}
                            selectedInterventionId={selectedInterventionId}
                            placeholder={MESSAGES.changeTo}
                        />
                    </>
                )}
                {disabled || interventions.length === 0 ? null : (
                    <Tooltip title={formatMessage(MESSAGES.customizeTooltip)}>
                        {editMode ? (
                            <Button
                                variant="contained"
                                onClick={() =>
                                    applyInterventionToOrgUnits(
                                        selectedOrgUnits,
                                        selectedInterventionId,
                                    )
                                }
                                sx={styles.customizeButton}
                            >
                                {formatMessage(MESSAGES.ok)}
                            </Button>
                        ) : (
                            <Button
                                variant="outlined"
                                onClick={() => setEditMode(!editMode)}
                                sx={styles.customizeButton}
                            >
                                {formatMessage(MESSAGES.customize)}
                            </Button>
                        )}
                    </Tooltip>
                )}
            </MapActionBox>
        </Box>
    );
};
