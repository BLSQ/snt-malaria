import { useEffect, useMemo, useState } from 'react';
import { MetricValue } from '../../dataLayers/types/metrics';
import { resolveSelectedYear } from '../utils/yearSelection';

type PreviewYearSelection = {
    /** True when the values span more than one year, i.e. a year picker is needed. */
    isMultiYear: boolean;
    selectedYear?: number;
    setSelectedYear: (year: number) => void;
    /** The values to render: filtered to the selected year for multi-year data, as-is otherwise. */
    displayedValues?: MetricValue[];
};

/**
 * Year picking for the in-node map previews. Multi-year data ships one value per org unit per
 * year; default to the year closest to the current one (keeping the user's pick while it remains
 * available) and filter the rendered values down to it.
 */
export const usePreviewYearSelection = (
    years: number[],
    metricValues?: MetricValue[],
): PreviewYearSelection => {
    const isMultiYear = years.length > 1;

    const [selectedYear, setSelectedYear] = useState<number | undefined>(
        undefined,
    );
    useEffect(() => {
        if (!isMultiYear) {
            setSelectedYear(undefined);
            return;
        }
        setSelectedYear(prev => resolveSelectedYear(years, prev));
    }, [isMultiYear, years]);

    const displayedValues = useMemo(() => {
        if (!isMultiYear || selectedYear == null) return metricValues;
        return (metricValues ?? []).filter(
            value => value.year === selectedYear,
        );
    }, [metricValues, isMultiYear, selectedYear]);

    return { isMultiYear, selectedYear, setSelectedYear, displayedValues };
};
