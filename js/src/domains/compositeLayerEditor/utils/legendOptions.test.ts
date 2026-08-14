import { LegendTypes } from '../../../constants/legend';
import { MESSAGES } from '../messages';
import { getCompositeLegendOptions } from './legendOptions';

const formatMessage = (message: { id: string }) => message.id;

describe('getCompositeLegendOptions', () => {
    it('lists auto, reference, then the three concrete legend types, in that order', () => {
        expect(getCompositeLegendOptions(formatMessage)).toEqual([
            { value: LegendTypes.AUTO, label: MESSAGES.legendAuto.id },
            {
                value: LegendTypes.REFERENCE,
                label: MESSAGES.legendReference.id,
            },
            { value: LegendTypes.LINEAR, label: MESSAGES.legendLinear.id },
            {
                value: LegendTypes.THRESHOLD,
                label: MESSAGES.legendThreshold.id,
            },
            { value: LegendTypes.ORDINAL, label: MESSAGES.legendOrdinal.id },
        ]);
    });
});
