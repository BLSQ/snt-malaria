import {
    buildOperatorPreviewRules,
    buildValuePreviewRules,
} from './useCriterionPreview';

describe('buildOperatorPreviewRules', () => {
    it('keys one single-criterion rule per operator', () => {
        expect(buildOperatorPreviewRules(7, 12.5)).toEqual({
            '>=': { and: [{ '>=': [{ var: 7 }, 12.5] }] },
            '<=': { and: [{ '<=': [{ var: 7 }, 12.5] }] },
            '>': { and: [{ '>': [{ var: 7 }, 12.5] }] },
            '<': { and: [{ '<': [{ var: 7 }, 12.5] }] },
            '==': { and: [{ '==': [{ var: 7 }, 12.5] }] },
        });
    });
});

describe('buildValuePreviewRules', () => {
    it('keys one "equal to" rule per value', () => {
        expect(buildValuePreviewRules(7, ['low', 'high'])).toEqual({
            low: { and: [{ '==': [{ var: 7 }, 'low'] }] },
            high: { and: [{ '==': [{ var: 7 }, 'high'] }] },
        });
    });
});
