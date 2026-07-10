export type AccountSettings = {
    id: number;
    focus_org_unit_type_id?: number;
    intervention_org_unit_type_id?: number;
    default_population_id?: number | null;
    has_ai_api_key: boolean;
};
