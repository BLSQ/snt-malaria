export const currentYear = new Date().getFullYear();
export const DataLayerYearOptions = Array.from(
    { length: currentYear - 2000 + 1 },
    (_, i) => {
        const year = 2000 + i;
        return { label: year.toString(), value: year };
    },
);
