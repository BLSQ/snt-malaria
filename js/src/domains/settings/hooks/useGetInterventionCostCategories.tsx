import { DropdownOptions } from 'Iaso/types/utils';

// TODO: This should come from the API with a useGetInterventionCostCategories
// TODO: Label should be translated from API
// TODO: value is the ID of the category
export const useGetInterventionCostCategories = (): DropdownOptions<any>[] => {
    return [
        { value: 1, label: 'Procurement' },
        { value: 2, label: 'Support' },
        { value: 3, label: 'Implementation' },
    ];
};
