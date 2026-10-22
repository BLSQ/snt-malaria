import { useMemo } from 'react';
import {
    MatchWarningOrgUnit,
    OrgUnitRef,
    ScenarioDisplay,
    ScenarioImpactMetrics,
} from '../types';

type ScenarioOrgUnits = {
    scenario: ScenarioDisplay;
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

export const useMatchWarnings = ({
    impactsByScenarioId,
    displayScenarios,
}: UseMatchWarningsArgs) => {
    return useMemo(() => {
        const notFound: ScenarioOrgUnits[] = [];
        const unmatched: ScenarioOrgUnits[] = [];

        displayScenarios.forEach(scenario => {
            const impact = impactsByScenarioId.get(scenario.id);
            if (!impact) return;
            notFound.push({
                scenario,
                orgUnits: impact.org_units_not_found ?? [],
            });
            unmatched.push({
                scenario,
                orgUnits: impact.org_units_with_unmatched_interventions ?? [],
            });
        });

        return {
            orgUnitsNotFound: mergeOrgUnitsAcrossScenarios(notFound),
            orgUnitsWithUnmatchedInterventions:
                mergeOrgUnitsAcrossScenarios(unmatched),
        };
    }, [impactsByScenarioId, displayScenarios]);
};
