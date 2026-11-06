import { useCallback, useState } from 'react';

type OrgUnitSelection = {
    /** `undefined` means every org unit is selected; `[]` means the selection was cleared. */
    selectedIds: number[] | undefined;
    /** Last non-empty selection, `undefined` meaning every org unit. */
    appliedIds: number[] | undefined;
    setSelectedIds: (ids: number[] | undefined) => void;
};

export const useOrgUnitSelection = (): OrgUnitSelection => {
    const [appliedIds, setAppliedIds] = useState<number[] | undefined>();
    const [isCleared, setIsCleared] = useState(false);

    const setSelectedIds = useCallback((ids: number[] | undefined) => {
        const isEmpty = ids?.length === 0;
        setIsCleared(isEmpty);
        if (!isEmpty) {
            setAppliedIds(ids);
        }
    }, []);

    return {
        selectedIds: isCleared ? [] : appliedIds,
        appliedIds,
        setSelectedIds,
    };
};
