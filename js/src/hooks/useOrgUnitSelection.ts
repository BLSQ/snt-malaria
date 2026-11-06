import { useState } from 'react';

type OrgUnitSelection = {
    selectedIds: number[];
    setSelectedIds: (ids: number[]) => void;
    hasSelection: boolean;
};

/** Selected intervention-level org unit ids; empty means national. */
export const useOrgUnitSelection = (): OrgUnitSelection => {
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    return {
        selectedIds,
        setSelectedIds,
        hasSelection: selectedIds.length > 0,
    };
};
