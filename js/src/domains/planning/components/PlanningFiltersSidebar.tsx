import React, { FC, useEffect, useMemo, useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    CardHeader,
    CircularProgress,
    FormControl,
    MenuItem,
    Select,
    Typography,
} from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { useSafeIntl } from 'bluesquare-components';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { useGetOrgUnitTypesDropdownOptions } from 'Iaso/domains/orgUnits/orgUnitTypes/hooks/useGetOrgUnitTypesDropdownOptions';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../messages';
import { useGetOrgUnitsByType } from '../hooks/useGetOrgUnits';

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
        marginBottom: 2,
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
    loadingContainer: {
        display: 'flex',
        justifyContent: 'center',
        padding: 2,
    },
};

type Props = {
    orgUnits: OrgUnit[];
    selectedOrgUnitId: number | null;
    onOrgUnitChange: (orgUnitId: number | null) => void;
};

export const PlanningFiltersSidebar: FC<Props> = ({
    orgUnits,
    selectedOrgUnitId,
    onOrgUnitChange,
}) => {
    const { formatMessage } = useSafeIntl();
    const [selectedOrgUnitTypeId, setSelectedOrgUnitTypeId] = useState<
        number | null
    >(null);

    const { data: orgUnitTypes, isLoading: isLoadingTypes } =
        useGetOrgUnitTypesDropdownOptions();

    const { data: orgUnitsByType, isLoading: isLoadingOrgUnits } =
        useGetOrgUnitsByType(selectedOrgUnitTypeId);

    // Determine the parent type depth from the org units data.
    //
    // TODO:
    // We're hitting the limits of what we can do with our simple "just fetch
    // valid OUs that have geometry set". Ideally, we also have shapefiles for the
    // ancestors of the districts/zones de sante, so we can show these borders on the
    // map.
    // I think this will require us to configure somewhere the OU type that we're
    // assigning interventions on.
    const parentTypeDepth = useMemo(() => {
        if (!orgUnits || orgUnits.length === 0) return null;
        const firstOrgUnit = orgUnits[0];
        if (
            firstOrgUnit.org_unit_type_depth !== null &&
            firstOrgUnit.org_unit_type_depth !== undefined
        ) {
            return firstOrgUnit.org_unit_type_depth - 1;
        }
        return null;
    }, [orgUnits]);

    // Filter org unit types to show only types with depth <= parentTypeDepth
    // Note: The original object from API includes depth, but OriginalOrgUnitType type doesn't declare it
    const filteredOrgUnitTypes = useMemo(() => {
        if (!orgUnitTypes || parentTypeDepth === null) return [];
        return orgUnitTypes.filter(type => {
            const depth = (type.original as { depth?: number | null }).depth;
            return depth && depth <= parentTypeDepth;
        });
    }, [orgUnitTypes, parentTypeDepth]);

    // Sort org units alphabetically for the dropdown
    const sortedOrgUnitsByType = useMemo(() => {
        if (!orgUnitsByType) return [];
        return [...orgUnitsByType].sort((a, b) => a.name.localeCompare(b.name));
    }, [orgUnitsByType]);

    // Get the selected org unit type's label for the dynamic dropdown label
    const selectedOrgUnitTypeLabel = useMemo(() => {
        if (!selectedOrgUnitTypeId || !filteredOrgUnitTypes) return null;
        const selectedType = filteredOrgUnitTypes.find(
            type => Number(type.value) === selectedOrgUnitTypeId,
        );
        return selectedType?.label ?? null;
    }, [selectedOrgUnitTypeId, filteredOrgUnitTypes]);

    // Auto-select the highest ancestor (lowest depth) when org unit types load
    // TODO: Same here, this should be easier to determine
    useEffect(() => {
        if (filteredOrgUnitTypes.length > 0 && selectedOrgUnitTypeId === null) {
            // Find the org unit type with the lowest depth (highest ancestor)
            const highestAncestor = filteredOrgUnitTypes.reduce(
                (prev, curr) => {
                    const prevDepth =
                        (prev.original as { depth?: number | null }).depth ??
                        Infinity;
                    const currDepth =
                        (curr.original as { depth?: number | null }).depth ??
                        Infinity;
                    return currDepth < prevDepth ? curr : prev;
                },
            );
            setSelectedOrgUnitTypeId(Number(highestAncestor.value));
        }
    }, [filteredOrgUnitTypes, selectedOrgUnitTypeId]);

    const handleTypeChange = (event: { target: { value: unknown } }) => {
        const value = event.target.value;
        const newTypeId = value === '' ? null : Number(value);
        setSelectedOrgUnitTypeId(newTypeId);
        // Clear org unit selection when type changes
        onOrgUnitChange(null);
    };

    const handleOrgUnitChange = (event: { target: { value: unknown } }) => {
        const value = event.target.value;
        onOrgUnitChange(value === '' ? null : (value as number));
    };

    return (
        <Card elevation={2} sx={styles.sidebarCard}>
            <CardHeader title={formatMessage(MESSAGES.sidebarTitle)} />
            <CardContent sx={styles.sidebarCardContent}>
                <Box>
                    <Typography sx={styles.label}>
                        {formatMessage(MESSAGES.displayLevel)}
                    </Typography>
                    <FormControl sx={styles.formControl}>
                        <Select
                            value={selectedOrgUnitTypeId ?? ''}
                            onChange={handleTypeChange}
                            variant="outlined"
                            IconComponent={ArrowDropDownIcon}
                            sx={styles.select}
                            size="small"
                            disabled={isLoadingTypes}
                        >
                            {filteredOrgUnitTypes.map(type => (
                                <MenuItem
                                    key={type.value}
                                    value={Number(type.value)}
                                >
                                    {type.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
                <Box>
                    <Typography sx={styles.label}>
                        {selectedOrgUnitTypeLabel ??
                            formatMessage(MESSAGES.displayLevel)}
                    </Typography>
                    <FormControl sx={styles.formControl}>
                        <Select
                            value={selectedOrgUnitId ?? ''}
                            onChange={handleOrgUnitChange}
                            variant="outlined"
                            IconComponent={ArrowDropDownIcon}
                            sx={styles.select}
                            displayEmpty
                            size="small"
                            disabled={
                                !selectedOrgUnitTypeId || isLoadingOrgUnits
                            }
                        >
                            <MenuItem value="">
                                {formatMessage(MESSAGES.allOrgUnits)}
                            </MenuItem>
                            {sortedOrgUnitsByType.map(orgUnit => (
                                <MenuItem key={orgUnit.id} value={orgUnit.id}>
                                    {orgUnit.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    {isLoadingOrgUnits && (
                        <Box sx={styles.loadingContainer}>
                            <CircularProgress size={24} />
                        </Box>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
};
