import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';

export type OrgUnitRow = {
    orgUnitId: number;
    adm1Name: string;
    adm2Name: string;
};

/** District (ADM2) rows for the manual-entry grid and the import template, sorted
 *  by region then district and shaped like `import_from_csv`'s columns. */
export const toOrgUnitRows = (orgUnits: OrgUnit[]): OrgUnitRow[] =>
    [...orgUnits]
        .map(orgUnit => ({
            orgUnitId: orgUnit.id,
            adm2Name: orgUnit.name,
            adm1Name: orgUnit.parent_name ?? orgUnit.parent?.name ?? '',
        }))
        .sort(
            (a, b) =>
                a.adm1Name.localeCompare(b.adm1Name) ||
                a.adm2Name.localeCompare(b.adm2Name),
        );
