import React, { FC, useMemo, useState } from 'react';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import {
    Box,
    Button,
    List,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import { SearchInput, useSafeIntl } from 'bluesquare-components';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../messages';
import {
    isDistrictPicked,
    OrgUnitSelection,
    OrgUnitSelectionMode,
    resetSelectionOverrides,
    setSelectionMode,
    toggleOrgUnit,
} from '../utils/orgUnitSelection';
import { DistrictListItem } from './DistrictListItem';

const styles = {
    root: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        gap: 1,
    },
    toggleButton: { flex: 1 },
    hint: {
        m: 0,
        mb: 1.5,
        color: 'text.secondary',
        fontSize: theme => theme.typography.pxToRem(12),
    },
    list: { flex: 1, overflowY: 'auto', minHeight: 0 },
    emptyState: { p: 1 },
    footer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
        pt: 1,
        borderTop: theme => `1px solid ${theme.palette.divider}`,
    },
} satisfies SxStyles;

const noop = () => undefined;

type Props = {
    value: OrgUnitSelection;
    onChange: (next: OrgUnitSelection) => void;
    orgUnits: OrgUnit[];
};

/**
 * The filter node's Dialog-only side panel: a bulk, searchable alternative to clicking districts
 * on the map one by one. Rendered inside `CollapsibleMapPreview`'s enlarged dialog, which is
 * portaled outside the canvas's `transform: scale(...)`, so plain MUI components are safe here
 * (unlike the on-canvas control body).
 */
export const OrgUnitSelectionPanel: FC<Props> = ({
    value,
    onChange,
    orgUnits,
}) => {
    const { formatMessage } = useSafeIntl();
    const [search, setSearch] = useState<string>('');

    const filteredOrgUnits = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return orgUnits;
        return orgUnits.filter(orgUnit =>
            (orgUnit.name ?? '').toLowerCase().includes(term),
        );
    }, [orgUnits, search]);

    const pickedCount = useMemo(
        () =>
            orgUnits.filter(orgUnit => isDistrictPicked(value, orgUnit.id))
                .length,
        [orgUnits, value],
    );

    return (
        <Box sx={styles.root}>
            <ToggleButtonGroup
                value={value.mode}
                exclusive
                fullWidth
                size="small"
                onChange={(
                    _event,
                    nextMode: OrgUnitSelectionMode | null,
                ) => {
                    if (nextMode) {
                        onChange(setSelectionMode(value, nextMode));
                    }
                }}
            >
                <ToggleButton value="all" sx={styles.toggleButton}>
                    {formatMessage(MESSAGES.filterSelectAllDistricts)}
                </ToggleButton>
                <ToggleButton value="none" sx={styles.toggleButton}>
                    {formatMessage(MESSAGES.filterSelectNoDistricts)}
                </ToggleButton>
            </ToggleButtonGroup>
            <Box component="p" sx={styles.hint}>
                {formatMessage(
                    value.mode === 'all'
                        ? MESSAGES.filterCheckboxHintAllMode
                        : MESSAGES.filterCheckboxHintNoneMode,
                )}
            </Box>
            <SearchInput
                label={formatMessage(MESSAGES.filterSearchDistrictsPlaceholder)}
                keyValue="filterDistrictsSearch"
                value={search}
                onChange={setSearch}
                onEnterPressed={noop}
                clearable
            />
            <List dense sx={styles.list}>
                {filteredOrgUnits.map(orgUnit => (
                    <DistrictListItem
                        key={orgUnit.id}
                        orgUnit={orgUnit}
                        picked={isDistrictPicked(value, orgUnit.id)}
                        onToggle={orgUnitId =>
                            onChange(toggleOrgUnit(value, orgUnitId))
                        }
                    />
                ))}
                {filteredOrgUnits.length === 0 && (
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={styles.emptyState}
                    >
                        {formatMessage(MESSAGES.filterNoSearchResults)}
                    </Typography>
                )}
            </List>
            <Box sx={styles.footer}>
                <Typography variant="caption" color="text.secondary">
                    {formatMessage(MESSAGES.filterPickedCount, {
                        count: pickedCount.toString(),
                    })}
                </Typography>
                <Button
                    size="small"
                    startIcon={<RestartAltIcon fontSize="small" />}
                    onClick={() =>
                        onChange(resetSelectionOverrides(value.mode))
                    }
                >
                    {formatMessage(MESSAGES.filterResetOverrides)}
                </Button>
            </Box>
        </Box>
    );
};
