import { mapTheme } from '../../../../constants/map-theme';
import {
    InterventionAssignmentResponse,
    InterventionCategory,
} from '../../types/interventions';
import { ScenarioRule } from '../../types/scenarioRule';

/** Label + color for one intervention chip in a map tooltip. */
export type InterventionChip = { id: number; name: string; color: string };

/** One intervention on one org unit for the map pipeline. */
export type NormalizedAssignment = {
    orgUnitId: number;
    interventionId: number;
    interventionName: string;
    ruleColor: string;
};

/**
 * Turns preview API state (matched org units × rule interventions) into flat
 * assignment rows — the same {@link NormalizedAssignment} shape as
 * {@link buildSavedAssignments} so map code can treat preview and saved data alike.
 */
export function buildPreviewAssignments({
    matchedOrgUnitIds,
    previewRule,
    interventionCategories,
}: {
    matchedOrgUnitIds: number[] | undefined;
    previewRule: Partial<ScenarioRule> | undefined;
    interventionCategories: InterventionCategory[];
}): NormalizedAssignment[] {
    const allInterventions = interventionCategories.flatMap(
        c => c.interventions,
    );
    const color = previewRule?.color || mapTheme.shapeColor;

    return (matchedOrgUnitIds ?? []).flatMap(orgUnitId =>
        (previewRule?.intervention_properties ?? [])
            .map(ip => allInterventions.find(i => i.id === ip.intervention))
            .filter(Boolean)
            .map(i => ({
                orgUnitId,
                interventionId: i!.id,
                interventionName: i!.short_name,
                ruleColor: color,
            })),
    );
}

/** Maps persisted intervention assignments from the API into normalized rows. */
export function buildSavedAssignments(
    interventionAssignments: InterventionAssignmentResponse[],
): NormalizedAssignment[] {
    return interventionAssignments.map(a => ({
        orgUnitId: a.org_unit.id,
        interventionId: a.intervention.id,
        interventionName: a.intervention.short_name,
        ruleColor: a.rule?.color || mapTheme.shapeColor,
    }));
}
