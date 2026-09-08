import {
    domainRangeFromScale,
    initialTopColor,
    legendConfigFromForm,
    scaleFromDomainRange,
    topColorFromDomainRange,
} from './legendScale';

describe('scaleFromDomainRange', () => {
    it('zips domain and range into one row per scale break', () => {
        expect(
            scaleFromDomainRange({
                domain: [50, 150, 250],
                range: ['#A2CAEA', '#6BD39D', '#ACDF9B', '#F5F1A0'],
            }),
        ).toEqual([
            { value: 50, color: '#A2CAEA' },
            { value: 150, color: '#6BD39D' },
            { value: 250, color: '#ACDF9B' },
        ]);
    });

    it('falls back to black when a colour is missing', () => {
        expect(
            scaleFromDomainRange({ domain: [1, 2], range: ['#fff'] }),
        ).toEqual([
            { value: 1, color: '#fff' },
            { value: 2, color: '#000000' },
        ]);
    });

    it('handles an empty or missing legend config', () => {
        expect(scaleFromDomainRange({ domain: [], range: [] })).toEqual([]);
        expect(scaleFromDomainRange(undefined)).toEqual([]);
    });
});

describe('domainRangeFromScale', () => {
    it('is the inverse of scaleFromDomainRange for equal-length input', () => {
        const scale = [
            { value: 50, color: '#A2CAEA' },
            { value: 150, color: '#6BD39D' },
        ];
        expect(domainRangeFromScale(scale)).toEqual({
            domain: [50, 150],
            range: ['#A2CAEA', '#6BD39D'],
        });
    });

    it('appends the top-bucket colour so a threshold scale keeps its `>= last break` colour', () => {
        const scale = [
            { value: 50, color: '#aaa' },
            { value: 150, color: '#bbb' },
        ];
        expect(domainRangeFromScale(scale, '#ccc')).toEqual({
            domain: [50, 150],
            range: ['#aaa', '#bbb', '#ccc'],
        });
    });

    it('leaves the range 1:1 with the domain when no top colour is given', () => {
        const scale = [
            { value: 50, color: '#aaa' },
            { value: 150, color: '#bbb' },
        ];
        expect(domainRangeFromScale(scale).range).toEqual(['#aaa', '#bbb']);
    });
});

describe('legendConfigFromForm', () => {
    const scale = [
        { value: 50, color: '#aaa' },
        { value: 150, color: '#bbb' },
    ];

    it('appends the top colour for a threshold legend', () => {
        expect(legendConfigFromForm('threshold', scale, '#ccc').range).toEqual([
            '#aaa',
            '#bbb',
            '#ccc',
        ]);
    });

    it('ignores the top colour for a legend type without an open-ended top bucket', () => {
        expect(legendConfigFromForm('linear', scale, '#ccc').range).toEqual([
            '#aaa',
            '#bbb',
        ]);
    });
});

describe('topColorFromDomainRange', () => {
    it('returns the colour stored past the editable rows', () => {
        expect(
            topColorFromDomainRange({
                domain: [50, 150],
                range: ['#aaa', '#bbb', '#ccc'],
            }),
        ).toBe('#ccc');
    });

    it('is undefined when the range is 1:1 with the domain', () => {
        expect(
            topColorFromDomainRange({
                domain: [50, 150],
                range: ['#aaa', '#bbb'],
            }),
        ).toBeUndefined();
    });

    it('handles a missing or partial config without throwing', () => {
        expect(topColorFromDomainRange(undefined)).toBeUndefined();
        // composite auto/reference legends persist as `{}`
        expect(topColorFromDomainRange({} as any)).toBeUndefined();
        expect(
            topColorFromDomainRange({ domain: [1, 2] } as any),
        ).toBeUndefined();
    });
});

describe('initialTopColor', () => {
    it('uses the stored top-bucket colour when present', () => {
        expect(
            initialTopColor({ domain: [10, 20], range: ['#a', '#b', '#top'] }),
        ).toBe('#top');
    });

    it('falls back to the last band colour for a legacy 1:1 threshold legend', () => {
        expect(initialTopColor({ domain: [10, 20], range: ['#a', '#b'] })).toBe(
            '#b',
        );
    });

    it('falls back to the default colour when there is no range', () => {
        expect(initialTopColor(undefined)).toBe('#000000');
        expect(initialTopColor({} as any)).toBe('#000000');
    });
});
