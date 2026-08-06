import { useSafeIntl } from 'bluesquare-components';
import { LegendTypes } from '../../../constants/legend';
import { MESSAGES } from '../messages';

type FormatMessage = ReturnType<typeof useSafeIntl>['formatMessage'];

/**
 * Legend types offered for a composite layer, on the output node and in the layer dialogue alike:
 * the concrete types plus "auto" and "use reference layer", both resolved when the graph runs.
 */
export const getCompositeLegendOptions = (
    formatMessage: FormatMessage,
): { value: string; label: string }[] => [
    { value: LegendTypes.AUTO, label: formatMessage(MESSAGES.legendAuto) },
    {
        value: LegendTypes.REFERENCE,
        label: formatMessage(MESSAGES.legendReference),
    },
    { value: LegendTypes.LINEAR, label: formatMessage(MESSAGES.legendLinear) },
    {
        value: LegendTypes.THRESHOLD,
        label: formatMessage(MESSAGES.legendThreshold),
    },
    {
        value: LegendTypes.ORDINAL,
        label: formatMessage(MESSAGES.legendOrdinal),
    },
];
