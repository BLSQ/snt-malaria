export type CostUnitType = {
    id: number;
    name: string;
    value: string | null;
    invert_value: boolean;
    description: string;
};

export type CostUnitTypePayload = {
    id?: number;
    name: string;
    value: string | number | null;
    invert_value: boolean;
    description: string;
};
