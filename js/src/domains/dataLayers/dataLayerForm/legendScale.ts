import { Scale, ScaleDomainRange } from '../types/metrics';

const DEFAULT_COLOR = '#000000';

/** `{domain, range}` -> the form's editable `Scale[]` (one row per domain break).
 *  A shorter `range` (OpenHexa returns one extra top-bucket colour) is tolerated. */
export const scaleFromDomainRange = (
    legendConfig: ScaleDomainRange | undefined,
): Scale[] =>
    (legendConfig?.domain ?? []).map((value, index) => ({
        value,
        color: legendConfig?.range?.[index] || DEFAULT_COLOR,
    }));

/** The form's `Scale[]` -> the `{domain, range}` payload shape. `rangeTail` re-appends
 *  colours that live past the editable rows (OpenHexa's extra top-bucket colour). */
export const domainRangeFromScale = (
    scale: Scale[],
    rangeTail: string[] = [],
) => ({
    domain: scale.map(item => item.value),
    range: [...scale.map(item => item.color), ...rangeTail],
});
