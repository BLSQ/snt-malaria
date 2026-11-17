import { Intervention } from '../../interventions/types/intervention';
import { buildInterventionMixDiff } from './interventionMixDiff';

const intervention = (id: number, shortName: string) =>
    ({ id, short_name: shortName }) as Intervention;

const smc = intervention(1, 'SMC');
const iptp = intervention(2, 'IPTp');
const rtss = intervention(3, 'RTS,S');
const llin = intervention(4, 'LLIN campaign');

describe('buildInterventionMixDiff', () => {
    it('lists added interventions, then shared ones, then removed ones', () => {
        expect(
            buildInterventionMixDiff([rtss, smc, iptp], [smc, iptp, llin]),
        ).toEqual([
            { id: 3, label: 'RTS,S', change: 'added' },
            { id: 1, label: 'SMC', change: 'same' },
            { id: 2, label: 'IPTp', change: 'same' },
            { id: 4, label: 'LLIN campaign', change: 'removed' },
        ]);
    });

    it('marks every intervention as the same without a baseline', () => {
        expect(buildInterventionMixDiff([smc, llin])).toEqual([
            { id: 1, label: 'SMC', change: 'same' },
            { id: 4, label: 'LLIN campaign', change: 'same' },
        ]);
    });

    it('lists only removed interventions when the scenario assigns none', () => {
        expect(buildInterventionMixDiff([], [smc])).toEqual([
            { id: 1, label: 'SMC', change: 'removed' },
        ]);
    });
});
