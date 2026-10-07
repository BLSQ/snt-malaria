export type CostUnitType = {
    id: number;
    name: string;
    description: string;
    is_commodity: boolean;
};

export type CostUnitTypePayload = {
    id?: number;
    name: string;
    description: string;
    is_commodity: boolean;
};
