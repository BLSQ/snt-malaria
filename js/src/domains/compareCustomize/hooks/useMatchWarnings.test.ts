import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScenarioDisplay, ScenarioImpactMetrics } from '../types';
import { useMatchWarnings } from './useMatchWarnings';

const baseline: ScenarioDisplay = {
    id: 1,
    label: 'Baseline',
    color: '#673AB7',
};
const comparison: ScenarioDisplay = {
    id: 2,
    label: 'Comparison',
    color: '#FFC107',
};

const orgUnit = (id: number, name: string) => ({
    org_unit_id: id,
    org_unit_name: name,
});

const makeImpact = (
    overrides: Partial<ScenarioImpactMetrics> = {},
): ScenarioImpactMetrics =>
    ({
        org_units_not_found: [],
        unmatched_intervention_mixes: [],
        interventions_without_impact_ref: [],
        ...overrides,
    }) as ScenarioImpactMetrics;

const renderMatchWarnings = (
    impacts: [number, ScenarioImpactMetrics | undefined][],
    displayScenarios: ScenarioDisplay[] = [baseline, comparison],
) =>
    renderHook(() =>
        useMatchWarnings({
            impactsByScenarioId: new Map(impacts),
            displayScenarios,
        }),
    ).result.current;

describe('useMatchWarnings', () => {
    it('returns no warnings when no scenario has impact data', () => {
        const warnings = renderMatchWarnings([
            [1, undefined],
            [2, undefined],
        ]);

        expect(warnings).toEqual({
            orgUnitsNotFound: [],
            unmatchedInterventionMixes: [],
            interventionsWithoutImpactRef: [],
        });
    });

    it('merges districts not found across scenarios into one entry per district, sorted by name', () => {
        const warnings = renderMatchWarnings([
            [
                1,
                makeImpact({
                    org_units_not_found: [
                        orgUnit(20, 'Ndom'),
                        orgUnit(10, "Sa'a"),
                    ],
                }),
            ],
            [2, makeImpact({ org_units_not_found: [orgUnit(10, "Sa'a")] })],
        ]);

        expect(warnings.orgUnitsNotFound).toEqual([
            { ...orgUnit(20, 'Ndom'), scenarios: [baseline] },
            { ...orgUnit(10, "Sa'a"), scenarios: [baseline, comparison] },
        ]);
    });

    it('ignores impact data of scenarios that are not displayed', () => {
        const warnings = renderMatchWarnings(
            [
                [1, makeImpact()],
                [2, makeImpact({ org_units_not_found: [orgUnit(10, 'Wum')] })],
            ],
            [baseline],
        );

        expect(warnings.orgUnitsNotFound).toEqual([]);
    });

    it('groups unmatched mixes by intervention set regardless of order and sorts them by district count', () => {
        const smc = { id: 1, name: 'SMC' };
        const irs = { id: 2, name: 'IRS' };
        const r21 = { id: 3, name: 'R21' };
        const warnings = renderMatchWarnings([
            [
                1,
                makeImpact({
                    unmatched_intervention_mixes: [
                        {
                            interventions: [r21],
                            org_units: [orgUnit(1, 'Bafia')],
                        },
                        {
                            interventions: [smc, irs],
                            org_units: [orgUnit(2, 'Guider')],
                        },
                    ],
                }),
            ],
            [
                2,
                makeImpact({
                    unmatched_intervention_mixes: [
                        {
                            interventions: [irs, smc],
                            org_units: [
                                orgUnit(2, 'Guider'),
                                orgUnit(3, 'Garoua'),
                            ],
                        },
                    ],
                }),
            ],
        ]);

        expect(warnings.unmatchedInterventionMixes).toEqual([
            {
                key: '1-2',
                interventionNames: ['SMC', 'IRS'],
                scenarios: [baseline, comparison],
                orgUnitNames: ['Garoua', 'Guider'],
            },
            {
                key: '3',
                interventionNames: ['R21'],
                scenarios: [baseline],
                orgUnitNames: ['Bafia'],
            },
        ]);
    });

    it('groups interventions without an impact reference per intervention, sorted by name', () => {
        const pmc = { id: 7, name: 'PMC' };
        const iptp = { id: 8, name: 'IPTp' };
        const warnings = renderMatchWarnings([
            [
                1,
                makeImpact({
                    interventions_without_impact_ref: [
                        { intervention: pmc, org_units: [orgUnit(1, 'Buea')] },
                    ],
                }),
            ],
            [
                2,
                makeImpact({
                    interventions_without_impact_ref: [
                        { intervention: pmc, org_units: [orgUnit(2, 'Abo')] },
                        { intervention: iptp, org_units: [orgUnit(1, 'Buea')] },
                    ],
                }),
            ],
        ]);

        expect(warnings.interventionsWithoutImpactRef).toEqual([
            {
                key: '8',
                interventionNames: ['IPTp'],
                scenarios: [comparison],
                orgUnitNames: ['Buea'],
            },
            {
                key: '7',
                interventionNames: ['PMC'],
                scenarios: [baseline, comparison],
                orgUnitNames: ['Abo', 'Buea'],
            },
        ]);
    });
});
