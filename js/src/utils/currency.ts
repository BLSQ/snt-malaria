const getCurrencyParts = (currencyCode?: string): Intl.NumberFormatPart[] => {
    if (!currencyCode) {
        throw new Error('Missing currency code');
    }
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currencyCode,
    }).formatToParts(0);
};

// currencyCode is user-entered and only regex-validated as 3 letters on
// input, not checked against real ISO 4217 codes, so Intl.NumberFormat can
// throw on garbage values - fall back to the raw code in that case.
export const getCurrencySymbol = (currencyCode?: string): string => {
    try {
        const currencyPart = getCurrencyParts(currencyCode).find(
            part => part.type === 'currency',
        );
        return currencyPart?.value ?? `${currencyCode} `;
    } catch {
        return currencyCode ? `${currencyCode} ` : '';
    }
};

export const formatCurrencyAmount = (
    value: number,
    currencyCode?: string,
): string => {
    if (!currencyCode) {
        return value.toLocaleString();
    }
    try {
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: currencyCode,
            maximumFractionDigits: 2,
        }).format(value);
    } catch {
        return `${getCurrencySymbol(currencyCode)}${value.toLocaleString()}`;
    }
};
