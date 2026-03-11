import React, { FC, useState } from 'react';
import { MenuItem, Select, SelectChangeEvent } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { MESSAGES } from '../domains/messages';
import { useGetOrgUnitsByType } from '../domains/planning/hooks/useGetOrgUnits';

type Props = {
    onOrgUnitChange: (orgUnitId?: number) => void;
    selectedOrgUnitId?: number;
};

export const OrgUnitSelect: FC<Props> = ({
    onOrgUnitChange,
    selectedOrgUnitId,
}) => {
    const { formatMessage } = useSafeIntl();
    const [orgUnitId, setOrgUnitId] = useState<number | undefined>(
        selectedOrgUnitId,
    );

    // TODO this should not be hardcoded, we should get the org unit type id from the config
    const orgUnitTypeId = 19;

    const { data: orgUnitsByType, isLoading: isLoadingOrgUnits } =
        useGetOrgUnitsByType(orgUnitTypeId);

    const handleOrgUnitChange = (e: SelectChangeEvent<number>) => {
        const id = e.target.value as number;
        setOrgUnitId(id);
        onOrgUnitChange(id);
    };

    return (
        <Select
            value={orgUnitId ?? ''}
            onChange={handleOrgUnitChange}
            variant="outlined"
            // IconComponent={ArrowDropDownIcon}
            // sx={styles.select}
            displayEmpty
            disabled={isLoadingOrgUnits}
        >
            <MenuItem value="">{formatMessage(MESSAGES.allOrgUnits)}</MenuItem>
            {orgUnitsByType?.map(orgUnit => (
                <MenuItem key={orgUnit.id} value={orgUnit.id}>
                    {orgUnit.name}
                </MenuItem>
            ))}
        </Select>
    );
};
