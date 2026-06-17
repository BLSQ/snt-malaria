export type Donor = {
    id: number;
    name: string;
};

export type Grant = {
    id: number;
    name: string;
    short_name: string;
    description: string;
    amount: number | null;
    donor: number;
    donor_name: string;
};

export type GrantPayload = {
    id?: number;
    name: string;
    short_name: string;
    description: string;
    amount: number | null;
    donor: number | null;
};

// Form values: donor can hold a free-typed name (string) for a donor
// that will be created implicitly when the grant is saved.
export type GrantFormValues = Omit<GrantPayload, 'donor'> & {
    donor: number | string | null;
};
