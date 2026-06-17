export type BudgetSettings = {
    id: number;
    local_currency: string;
    exchange_rate: string;
    inflation_rate: string;
};

export type BudgetSettingsPayload = {
    id: number;
    local_currency: string;
    exchange_rate: string | number;
    inflation_rate: string | number;
};
