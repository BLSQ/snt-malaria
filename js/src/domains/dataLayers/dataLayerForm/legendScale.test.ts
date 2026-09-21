import { domainRangeFromScale, scaleFromDomainRange } from './legendScale';

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

    it('re-appends the range tail so the top bucket keeps its colour', () => {
        const scale = [
            { value: 50, color: '#aaa' },
            { value: 150, color: '#bbb' },
        ];
        expect(domainRangeFromScale(scale, ['#ccc'])).toEqual({
            domain: [50, 150],
            range: ['#aaa', '#bbb', '#ccc'],
        });
    });
});
