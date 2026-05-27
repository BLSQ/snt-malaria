import { Intervention } from './intervention';

export type InterventionCategory = {
    id: number;
    name: string;
    short_name: string;
    description: string;
    interventions: Intervention[];
};
