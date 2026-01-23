import React, { FC, useMemo } from 'react';
import {
    Box,
    Card,
    CardContent,
    CardHeader,
    FormControl,
    MenuItem,
    Select,
    Typography,
} from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { useSafeIntl } from 'bluesquare-components';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../messages';

const styles: SxStyles = {
    sidebarCard: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: theme => theme.spacing(2),
        boxShadow: 'none',
    },
    sidebarCardContent: {
        padding: 2,
        height: '100%',
        overflow: 'auto',
        '&:last-child': {
            paddingBottom: 2,
        },
    },
    formControl: {
        width: '100%',
    },
    select: theme => ({
        backgroundColor: 'white',
        borderRadius: theme.spacing(1),
        '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(0, 0, 0, 0.23)',
        },
    }),
    label: {
        marginBottom: 1,
        fontWeight: 500,
        fontSize: '0.875rem',
        color: 'text.secondary',
    },
};

type ParentOption = {
    id: number;
    name: string;
};

type Props = {
    orgUnits: OrgUnit[];
    selectedParentId: number | null;
    onParentChange: (parentId: number | null) => void;
};

export const PlanningFiltersSidebar: FC<Props> = ({
    orgUnits,
    selectedParentId,
    onParentChange,
}) => {
    const { formatMessage } = useSafeIntl();

    const parentOptions: ParentOption[] = useMemo(() => {
        const parentsMap = new Map<number, string>();
        orgUnits.forEach(orgUnit => {
            if (orgUnit.parent_id && orgUnit.parent_name) {
                parentsMap.set(orgUnit.parent_id, orgUnit.parent_name);
            }
        });

        return Array.from(parentsMap.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [orgUnits]);

    const handleChange = (event: { target: { value: unknown } }) => {
        const value = event.target.value;
        onParentChange(value === '' ? null : (value as number));
    };

    return (
        <Card elevation={2} sx={styles.sidebarCard}>
            <CardHeader title={formatMessage(MESSAGES.filter)} />
            <CardContent sx={styles.sidebarCardContent}>
                <Box>
                    <Typography sx={styles.label}>
                        {formatMessage(MESSAGES.parentOrgUnit)}
                    </Typography>
                    <FormControl sx={styles.formControl}>
                        <Select
                            value={selectedParentId ?? ''}
                            onChange={handleChange}
                            variant="outlined"
                            IconComponent={ArrowDropDownIcon}
                            sx={styles.select}
                            displayEmpty
                            size="small"
                        >
                            <MenuItem value="">
                                {formatMessage(MESSAGES.allParentOrgUnits)}
                            </MenuItem>
                            {parentOptions.map(parent => (
                                <MenuItem key={parent.id} value={parent.id}>
                                    {parent.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            </CardContent>
        </Card>
    );
};
