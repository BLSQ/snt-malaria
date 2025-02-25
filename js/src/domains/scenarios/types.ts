type User = {
    id: number;
    first_name: string;
    last_name: string;
    username: string;
    full_name: string;
};

type Scenario = {
    id: number;
    created_by: User;
    name: string;
    description: string;
    created_at: string; // ISO 8601 formatted date string
    updated_at: string; // ISO 8601 formatted date string
};
