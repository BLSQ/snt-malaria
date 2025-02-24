import { Interventions } from "../components/interventionMix/InterventionsMix";

export type InterventionCategory={
    id: number;
    name: string;
    description: string;
    interventions: Intervention[];
}

export type Intervention = {
    id: number;
    name: string;
    cost_per_unit: number | null;
}