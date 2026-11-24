import { upsertCriterion } from './rule-map-actions';

describe('upsertCriterion', () => {
    it('replaces the criterion on the same metric type', () => {
        expect(
            upsertCriterion(
                [
                    { metric_type: 1, operator: '>', value: 2 },
                    { metric_type: 2, operator: '<', value: 5 },
                ],
                { metric_type: 2, operator: '>=', value: 7 },
            ),
        ).toEqual([
            { metric_type: 1, operator: '>', value: 2 },
            { metric_type: 2, operator: '>=', value: 7 },
        ]);
    });

    it('adds a criterion for a new metric type', () => {
        expect(
            upsertCriterion([{ metric_type: 1, operator: '>', value: 2 }], {
                metric_type: 3,
                operator: '==',
                string_value: 'high',
            }),
        ).toEqual([
            { metric_type: 1, operator: '>', value: 2 },
            { metric_type: 3, operator: '==', string_value: 'high' },
        ]);
    });
});
