import { useMemo } from 'react';
import {
    OrgUnitRef,
    ScenarioDisplay,
    ScenarioImpactMetrics,
    ScenarioMatchWarning,
} from '../types';

type UseMatchWarningsArgs = {
    impactsByScenarioId: Map<number, ScenarioImpactMetrics | undefined>;
    displayScenarios: ScenarioDisplay[];
};

export const useMatchWarnings = ({
    impactsByScenarioId,
    displayScenarios,
}: UseMatchWarningsArgs) => {
    return useMemo(() => {
        const scenarioMap = new Map(
            displayScenarios.map(s => [s.id, s]),
        );
        const notFound: ScenarioMatchWarning[] = [];
        const unmatched: ScenarioMatchWarning[] = [];
        const sortByName = (a: OrgUnitRef, b: OrgUnitRef) =>
            a.org_unit_name.localeCompare(b.org_unit_name);

        impactsByScenarioId.forEach((impact, scenarioId) => {
            if (!impact) return;
            const scenario = scenarioMap.get(scenarioId);
            if (!scenario) return;
            if (impact.org_units_not_found?.length) {
                notFound.push({
                    scenario,
                    orgUnits: [...impact.org_units_not_found].sort(sortByName),
                });
            }
            if (impact.org_units_with_unmatched_interventions?.length) {
                unmatched.push({
                    scenario,
                    orgUnits: [...impact.org_units_with_unmatched_interventions].sort(sortByName),
                });
            }
        });

        return {
            orgUnitsNotFound: notFound,
            orgUnitsWithUnmatchedInterventions: unmatched,
        };
    }, [impactsByScenarioId, displayScenarios]);
};
