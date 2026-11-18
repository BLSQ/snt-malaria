import { buildOperatorPreviewRules } from './useCriterionOperatorPreview';

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
