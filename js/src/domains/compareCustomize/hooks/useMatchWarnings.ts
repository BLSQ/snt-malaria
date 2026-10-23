import { useMemo } from 'react';
import {
    MatchWarningGroup,
    MatchWarningOrgUnit,
    OrgUnitRef,
    ScenarioDisplay,
    ScenarioImpactMetrics,
} from '../types';

type ScenarioOrgUnits = {
    scenario: ScenarioDisplay;
    orgUnits: OrgUnitRef[];
};

type ScenarioWarningGroup = {
    scenario: ScenarioDisplay;
    key: string;
    interventionNames: string[];
    orgUnits: OrgUnitRef[];
};

type UseMatchWarningsArgs = {
    impactsByScenarioId: Map<number, ScenarioImpactMetrics | undefined>;
    displayScenarios: ScenarioDisplay[];
};

const mergeOrgUnitsAcrossScenarios = (
    entries: ScenarioOrgUnits[],
): MatchWarningOrgUnit[] => {
    const byId = new Map<number, MatchWarningOrgUnit>();
    entries.forEach(({ scenario, orgUnits }) => {
        orgUnits.forEach(orgUnit => {
            const existing = byId.get(orgUnit.org_unit_id);
            if (existing) {
                existing.scenarios.push(scenario);
            } else {
                byId.set(orgUnit.org_unit_id, {
                    ...orgUnit,
                    scenarios: [scenario],
                });
            }
        });
    });
    return [...byId.values()].sort((a, b) =>
        a.org_unit_name.localeCompare(b.org_unit_name),
    );
};

const mergeGroupsAcrossScenarios = (
    entries: ScenarioWarningGroup[],
): MatchWarningGroup[] => {
    const byKey = new Map<
        string,
        Omit<MatchWarningGroup, 'orgUnitNames'> & { orgUnitNames: Set<string> }
    >();
    entries.forEach(({ scenario, key, interventionNames, orgUnits }) => {
        const existing = byKey.get(key) ?? {
            key,
            interventionNames,
            scenarios: [],
            orgUnitNames: new Set<string>(),
        };
        existing.scenarios.push(scenario);
        orgUnits.forEach(orgUnit =>
            existing.orgUnitNames.add(orgUnit.org_unit_name),
        );
        byKey.set(key, existing);
    });
    return [...byKey.values()].map(group => ({
        ...group,
        orgUnitNames: [...group.orgUnitNames].sort((a, b) =>
            a.localeCompare(b),
        ),
    }));
};

export const useMatchWarnings = ({
    impactsByScenarioId,
    displayScenarios,
}: UseMatchWarningsArgs) => {
    return useMemo(() => {
        const notFound: ScenarioOrgUnits[] = [];
        const unmatchedMixes: ScenarioWarningGroup[] = [];
        const withoutImpactRef: ScenarioWarningGroup[] = [];

        displayScenarios.forEach(scenario => {
            const impact = impactsByScenarioId.get(scenario.id);
            if (!impact) return;
            notFound.push({
                scenario,
                orgUnits: impact.org_units_not_found ?? [],
            });
            (impact.unmatched_intervention_mixes ?? []).forEach(mix => {
                unmatchedMixes.push({
                    scenario,
                    key: mix.interventions
                        .map(intervention => intervention.id)
                        .sort((a, b) => a - b)
                        .join('-'),
                    interventionNames: mix.interventions.map(
                        intervention => intervention.name,
                    ),
                    orgUnits: mix.org_units,
                });
            });
            (impact.interventions_without_impact_ref ?? []).forEach(
                ({ intervention, org_units }) => {
                    withoutImpactRef.push({
                        scenario,
                        key: `${intervention.id}`,
                        interventionNames: [intervention.name],
                        orgUnits: org_units,
                    });
                },
            );
        });

        return {
            orgUnitsNotFound: mergeOrgUnitsAcrossScenarios(notFound),
            unmatchedInterventionMixes: mergeGroupsAcrossScenarios(
                unmatchedMixes,
            ).sort((a, b) => b.orgUnitNames.length - a.orgUnitNames.length),
            interventionsWithoutImpactRef: mergeGroupsAcrossScenarios(
                withoutImpactRef,
            ).sort((a, b) =>
                a.interventionNames[0].localeCompare(b.interventionNames[0]),
            ),
        };
    }, [impactsByScenarioId, displayScenarios]);
};
