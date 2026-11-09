export const ORG_UNIT_IDS_API_PARAM = 'org_unit_ids';

export const serializeOrgUnitIds = (ids: number[] = []): string =>
    [...ids].sort((a, b) => a - b).join(',');
