import React, { FC, useMemo } from 'react';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
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
import { useSafeIntl } from 'bluesquare-components';
import { useGetOrgUnitTypesDropdownOptions } from 'Iaso/domains/orgUnits/orgUnitTypes/hooks/useGetOrgUnitTypesDropdownOptions';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../messages';
import { useGetOrgUnitsByType } from '../hooks/useGetOrgUnits';
import { useGetSNTConfig } from '../hooks/useGetSNTConfig';

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
    selectedOrgUnitTypeId: number | null;
    selectedOrgUnitId: number | null;
    onOrgUnitTypeChange: (orgUnitTypeId: number | null) => void;
    onOrgUnitChange: (orgUnitId: number | null) => void;
};

export const PlanningFiltersSidebar: FC<Props> = ({
    selectedOrgUnitTypeId,
    selectedOrgUnitId,
    onOrgUnitTypeChange,
    onOrgUnitChange,
}) => {
    const { formatMessage } = useSafeIntl();

    const { data: config, isLoading: isLoadingConfig } = useGetSNTConfig();
    const { data: allOUTypes, isLoading: isLoadingTypes } =
        useGetOrgUnitTypesDropdownOptions();
    const { data: orgUnitsByType, isLoading: isLoadingOrgUnits } =
        useGetOrgUnitsByType(selectedOrgUnitTypeId);

    // Validate presence and format of the SNT config
    const filteringEnabled = useMemo(() => {
        return (
            config &&
            typeof config.country_org_unit_type_id === 'number' &&
            typeof config.intervention_org_unit_type_id === 'number'
        );
    }, [config]);

    // Filter org unit types: keep types whose depth is strictly between
    // country and intervention (exclusive on both ends).
    //
    // Fallback: When config is not set, only show the "National" option and
    // hide the OU dropdown.
    const filteredOrgUnitTypes = useMemo(() => {
        if (!allOUTypes || !filteringEnabled || !config) return [];

        const getDepth = (typeId: number) => {
            const ouType = allOUTypes.find(t => Number(t.value) === typeId);
            return (ouType?.original as { depth?: number | null })?.depth;
        };
        const countryDepth = getDepth(config.country_org_unit_type_id);
        const interventionDepth = getDepth(
            config.intervention_org_unit_type_id,
        );

        if (countryDepth == null || interventionDepth == null) return [];

        return allOUTypes.filter(type => {
            const depth = (type.original as { depth?: number | null }).depth;
            return (
                depth != null &&
                depth > countryDepth &&
                depth < interventionDepth
            );
        });
    }, [allOUTypes, config]);

    // Get the selected org unit type's label for the second dropdown label
    const selectedOrgUnitTypeLabel = useMemo(() => {
        if (!selectedOrgUnitTypeId || !filteredOrgUnitTypes) return null;

        return filteredOrgUnitTypes.find(
            type => Number(type.value) === selectedOrgUnitTypeId,
        )?.label;
    }, [selectedOrgUnitTypeId, filteredOrgUnitTypes]);

    const handleTypeChange = event => {
        const value = event.target.value;
        onOrgUnitTypeChange(value === '' ? null : value);
    };

    const handleOrgUnitChange = event => {
        const value = event.target.value;
        onOrgUnitChange(value === '' ? null : value);
    };

    const isLoading = isLoadingConfig || isLoadingTypes;

    return (
        <Card elevation={2} sx={styles.sidebarCard}>
            <CardHeader title={formatMessage(MESSAGES.sidebarTitle)} />
            <CardContent sx={styles.sidebarCardContent}>
                {isLoading ? (
                    <Box sx={styles.loadingContainer}>
                        <CircularProgress size={24} />
                    </Box>
                ) : (
                    <>
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
                                    displayEmpty
                                    size="small"
                                >
                                    <MenuItem value="">
                                        {formatMessage(MESSAGES.national)}
                                    </MenuItem>
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
                        {selectedOrgUnitTypeId !== null && (
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
                                        disabled={isLoadingOrgUnits}
                                    >
                                        <MenuItem value="">
                                            {formatMessage(
                                                MESSAGES.allOrgUnits,
                                            )}
                                        </MenuItem>
                                        {orgUnitsByType?.map(orgUnit => (
                                            <MenuItem
                                                key={orgUnit.id}
                                                value={orgUnit.id}
                                            >
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
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
};
