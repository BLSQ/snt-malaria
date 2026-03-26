import { LegendTypes } from '../../../../constants/legend';
import { mapTheme } from '../../../../constants/map-theme';
import { blendColors } from '../../../planning/libs/color-utils';
import {
    InterventionChip,
    NormalizedAssignment,
} from './buildEffectiveAssignments';

const EMPTY_LEGEND = {
    units: '',
    legend_type: LegendTypes.ORDINAL,
    legend_config: { domain: [] as string[], range: [] as string[] },
    unit_symbol: '',
};

const UNASSIGNED_STYLE = { label: '', color: mapTheme.shapeColor };

/** Per–org-unit style accessors + legend config derived from assignments. */
export type AssignmentDisplay = {
    getStyle: (orgUnitId: number) => { label: string; color: string };
    getChips: (orgUnitId: number) => InterventionChip[];
    legend: typeof EMPTY_LEGEND & {
        legend_config: { domain: string[]; range: string[] };
    };
};

/**
 * Aggregates {@link NormalizedAssignment} rows by org unit, blends fill colors when
 * several rules overlap, and builds an ordinal legend (domain/range) for the map.
 */
export function buildAssignmentDisplay(
    effectiveAssignments: NormalizedAssignment[],
): AssignmentDisplay {
    const byOrgUnit = new Map<
        number,
        {
            colors: Set<string>;
            chipsByInterventionId: Map<number, InterventionChip>;
        }
    >();

    effectiveAssignments.forEach(
        ({ orgUnitId, interventionId, interventionName, ruleColor }) => {
            let entry = byOrgUnit.get(orgUnitId);
            if (!entry) {
                entry = {
                    colors: new Set(),
                    chipsByInterventionId: new Map(),
                };
                byOrgUnit.set(orgUnitId, entry);
            }

            entry.colors.add(ruleColor);

            if (!entry.chipsByInterventionId.has(interventionId)) {
                entry.chipsByInterventionId.set(interventionId, {
                    id: interventionId,
                    name: interventionName,
                    color: ruleColor,
                });
            }
        },
    );

    const blendCache = new Map<string, { label: string; color: string }>();
    const styleByOrgUnit = new Map<number, { label: string; color: string }>();
    const chipsByOrgUnit = new Map<number, InterventionChip[]>();

    byOrgUnit.forEach(({ colors, chipsByInterventionId }, orgUnitId) => {
        const chips = [...chipsByInterventionId.values()];
        chipsByOrgUnit.set(orgUnitId, chips);

        const colorKey = [...colors].sort().join(',');
        if (!blendCache.has(colorKey)) {
            const uniqueColors = [...colors];
            blendCache.set(colorKey, {
                label: chips.map(c => c.name).join(', '),
                color:
                    uniqueColors.length === 1
                        ? uniqueColors[0]
                        : blendColors(uniqueColors),
            });
        }
        styleByOrgUnit.set(orgUnitId, blendCache.get(colorKey)!);
    });

    const legendDomain: string[] = [];
    const legendRange: string[] = [];
    blendCache.forEach(({ label, color }) => {
        legendDomain.push(label);
        legendRange.push(color);
    });

    return {
        getStyle: (orgUnitId: number) =>
            styleByOrgUnit.get(orgUnitId) ?? UNASSIGNED_STYLE,
        getChips: (orgUnitId: number) => chipsByOrgUnit.get(orgUnitId) ?? [],
        legend: {
            ...EMPTY_LEGEND,
            legend_config: { domain: legendDomain, range: legendRange },
        },
    };
}
