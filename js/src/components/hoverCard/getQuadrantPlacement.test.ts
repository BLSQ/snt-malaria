import { getQuadrantPlacement } from './getQuadrantPlacement';

const country = new DOMRect(0, 0, 1000, 800);

describe('getQuadrantPlacement', () => {
    it('opens away from the centre of the country', () => {
        expect(getQuadrantPlacement({ x: 100, y: 100 }, country)).toBe(
            'top-end',
        );
        expect(getQuadrantPlacement({ x: 900, y: 100 }, country)).toBe(
            'top-start',
        );
        expect(getQuadrantPlacement({ x: 100, y: 700 }, country)).toBe(
            'bottom-end',
        );
        expect(getQuadrantPlacement({ x: 900, y: 700 }, country)).toBe(
            'bottom-start',
        );
    });

    it('keeps the current side while the pointer is near the centre', () => {
        const nearCentre = { x: 520, y: 420 };
        expect(getQuadrantPlacement(nearCentre, country, 'top-end')).toBe(
            'top-end',
        );
        expect(getQuadrantPlacement(nearCentre, country, 'bottom-start')).toBe(
            'bottom-start',
        );
    });

    it('switches once the pointer is clearly past the centre', () => {
        expect(
            getQuadrantPlacement({ x: 650, y: 550 }, country, 'top-end'),
        ).toBe('bottom-start');
    });

    it('uses the same dead zone whatever the size of the country', () => {
        const largeCountry = new DOMRect(0, 0, 4000, 3200);
        expect(
            getQuadrantPlacement({ x: 2050, y: 1650 }, largeCountry, 'top-end'),
        ).toBe('bottom-start');
    });
});
