import { buildAssignmentDisplay } from './buildAssignmentDisplay';

describe('buildAssignmentDisplay', () => {
    it('lists each intervention of an org unit in the colour of its rule', () => {
        const display = buildAssignmentDisplay([
            {
                orgUnitId: 1,
                interventionId: 10,
                interventionName: 'SMC',
                ruleId: 100,
                ruleColor: '#673AB7',
            },
            {
                orgUnitId: 1,
                interventionId: 11,
                interventionName: 'LLIN',
                ruleId: 101,
                ruleColor: '#FFC107',
            },
        ]);

        expect(display.getChips(1)).toEqual([
            { id: 10, name: 'SMC', color: '#673AB7' },
            { id: 11, name: 'LLIN', color: '#FFC107' },
        ]);
    });

    it('keeps the first rule when two rules assign the same intervention', () => {
        const display = buildAssignmentDisplay([
            {
                orgUnitId: 1,
                interventionId: 10,
                interventionName: 'SMC',
                ruleColor: '#673AB7',
            },
            {
                orgUnitId: 1,
                interventionId: 10,
                interventionName: 'SMC',
                ruleColor: '#FFC107',
            },
        ]);

        expect(display.getChips(1)).toEqual([
            { id: 10, name: 'SMC', color: '#673AB7' },
        ]);
    });
});
