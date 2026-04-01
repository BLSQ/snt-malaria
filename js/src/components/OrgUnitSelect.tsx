import React, { FC, useState } from 'react';
import { MenuItem, Select, SelectChangeEvent } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../domains/messages';
import { useGetOrgUnitsByType } from '../domains/planning/hooks/useGetOrgUnits';
import { useGetAccountSettings } from '../domains/planningV2/hooks/useGetAccountSettings';

const styles = {
    select: {
        minWidth: '225px',
    },
} satisfies SxStyles;

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

    const { data: accountSettings } = useGetAccountSettings();

    const { data: orgUnitsByType, isLoading: isLoadingOrgUnits } =
        useGetOrgUnitsByType(accountSettings?.focus_org_unit_type_id);

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
            sx={styles.select}
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
