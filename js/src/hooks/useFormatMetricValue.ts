import { useCallback } from 'react';
import { useSafeIntl } from 'bluesquare-components';

/** A metric value as shown in hover cards: numbers with at most 2 decimals, then the unit. */
export const useFormatMetricValue = () => {
    const { formatNumber } = useSafeIntl();
    return useCallback(
        (value: string | number, unitSymbol?: string) =>
            `${
                typeof value === 'number'
                    ? formatNumber(value, { maximumFractionDigits: 2 })
                    : value
            }${unitSymbol ?? ''}`,
        [formatNumber],
    );
};
