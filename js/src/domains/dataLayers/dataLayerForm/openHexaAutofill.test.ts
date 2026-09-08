import { OpenHexaDataLayer } from '../types/metrics';
import { openHexaLayerToFormPatch } from './openHexaAutofill';

const layer = (
    overrides: Partial<OpenHexaDataLayer> = {},
): OpenHexaDataLayer => ({
    code: 'INCIDENCE_CRUDE',
    name: 'Crude incidence (DHIS2)',
    description: 'Number of malaria cases relative to the population.',
    source: 'DHIS2',
    units: 'Per 1000 people',
    category: 'Epidemiological indicators',
    unit_symbol: '',
    legend_type: 'threshold',
    legend_config: {
        domain: [50, 150, 250, 350, 450, 1000],
        range: [
            '#A2CAEA',
            '#6BD39D',
            '#ACDF9B',
            '#F5F1A0',
            '#F2B16E',
            '#E4754F',
            '#A93A42',
        ],
    },
    metric_kind: 'any',
    ...overrides,
});

describe('openHexaLayerToFormPatch', () => {
    it('maps the metadata fields the form pre-fills', () => {
        const patch = openHexaLayerToFormPatch(layer());
        expect(patch).toMatchObject({
            code: 'INCIDENCE_CRUDE',
            name: 'Crude incidence (DHIS2)',
            category: 'Epidemiological indicators',
            units: 'Per 1000 people',
            unit_symbol: '',
            legend_type: 'threshold',
            is_population: false,
        });
        expect(patch.legend_config).toHaveLength(6);
    });

    it('flags population layers from metric_kind', () => {
        expect(
            openHexaLayerToFormPatch(layer({ metric_kind: 'population' }))
                .is_population,
        ).toBe(true);
    });

    it('defaults a missing legend type to threshold', () => {
        expect(
            openHexaLayerToFormPatch(layer({ legend_type: '' })).legend_type,
        ).toBe('threshold');
    });

    it('keeps the extra top-bucket colour(s) in legend_range_tail', () => {
        // 6 domain breaks, 7 colours -> 6 editable rows + 1 tail colour
        expect(openHexaLayerToFormPatch(layer()).legend_range_tail).toEqual([
            '#A93A42',
        ]);
    });
});
