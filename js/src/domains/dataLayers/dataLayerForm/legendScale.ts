import { hasOpenEndedTopBucket } from '../../../constants/legend';
import { Scale, ScaleDomainRange } from '../types/metrics';

export const DEFAULT_COLOR = '#000000';

/** `{domain, range}` -> the form's editable `Scale[]` (one row per domain break).
 *  A shorter `range` (OpenHexa returns one extra top-bucket colour) is tolerated. */
export const scaleFromDomainRange = (
    legendConfig: ScaleDomainRange | undefined,
): Scale[] =>
    (legendConfig?.domain ?? []).map((value, index) => ({
        value,
        color: legendConfig?.range?.[index] || DEFAULT_COLOR,
    }));

/** The form's `Scale[]` -> the `{domain, range}` payload shape. `topColor`, when given,
 *  is appended so a threshold scale gets its extra `>= last break` bucket colour. */
export const domainRangeFromScale = (scale: Scale[], topColor?: string) => ({
    domain: scale.map(item => item.value),
    range: [...scale.map(item => item.color), ...(topColor ? [topColor] : [])],
});

/** Form fields -> the `{domain, range}` payload, applying the per-legend-type rule for
 *  whether the extra `>= last break` colour belongs on the range. */
export const legendConfigFromForm = (
    legendType: string,
    scale: Scale[],
    topColor?: string,
) =>
    domainRangeFromScale(
        scale,
        hasOpenEndedTopBucket(legendType) ? topColor : undefined,
    );

/** The `>= last break` colour stored past the editable rows, if the config carries one.
 *  Tolerates a partial/empty config (composite auto/reference legends persist as `{}`). */
export const topColorFromDomainRange = (
    legendConfig: ScaleDomainRange | undefined,
): string | undefined => {
    const domain = legendConfig?.domain;
    const range = legendConfig?.range;
    return domain && range ? range[domain.length] : undefined;
};

/** Initial value for the top-bucket colour picker: the stored colour, else the last band's
 *  colour so a legacy 1:1 threshold legend doesn't gain a black `>= last break` band the
 *  first time it is saved. */
export const initialTopColor = (
    legendConfig: ScaleDomainRange | undefined,
): string => {
    const range = legendConfig?.range;
    return (
        topColorFromDomainRange(legendConfig) ??
        (range && range[range.length - 1]) ??
        DEFAULT_COLOR
    );
};
