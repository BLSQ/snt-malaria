import React, { FC, useCallback, useMemo } from 'react';
import { Box, useTheme } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';
import { mapTheme } from '../../../constants/map-theme';
import { MESSAGES } from '../messages';
import {
    isOrgUnitSelected,
    normalizeSelection,
    OrgUnitSelection,
    OrgUnitSelectionMode,
    resolveSelectedOrgUnitIds,
    setSelectionMode,
    toggleOrgUnit,
} from '../utils/orgUnitSelection';
import { CollapsibleMapPreview } from './CollapsibleMapPreview';
import { OrgUnitSelectionPanel } from './OrgUnitSelectionPanel';

const styles = {
    root: {
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        width: '100%',
        '& select': {
            width: '100%',
            boxSizing: 'border-box',
            background: theme => theme.palette.background.paper,
            color: theme => theme.palette.text.primary,
            border: theme => `1px solid ${theme.palette.divider}`,
            borderRadius: '6px',
            padding: theme => theme.spacing(0.5),
            fontSize: 13,
        },
    },
    summary: {
        m: 0,
        color: 'text.secondary',
        fontSize: theme => theme.typography.pxToRem(12),
    },
} satisfies SxStyles;

// The raw persisted control value: the selection itself plus a UI-only `expanded` flag (the
// backend evaluator reads only `mode`/`ids` and ignores anything else).
type RawValue = Partial<OrgUnitSelection> & { expanded?: boolean };

type Props = {
    value?: RawValue;
    onChange: (value: RawValue) => void;
    orgUnits: OrgUnit[];
    /** Recomputes Flume's connection curves; called while the node resizes. */
    onResize?: () => void;
};

/**
 * On-canvas body of the `filter` node's district picker: an all/none toggle, a selection summary,
 * and a minimap preview (selected districts in the theme's primary color). Clicking a district
 * toggles it, on both the thumbnail and the enlarged dialog map. Bulk editing (search, checkbox
 * list) lives in the dialog only - see `OrgUnitSelectionPanel`/`CollapsibleMapPreview`'s
 * `dialogSidePanel`.
 *
 * Uses a native `<select>` on purpose: its dropdown is browser-rendered and therefore unaffected
 * by the editor's CSS `transform: scale(...)`, unlike an MUI portal (see `MappingsControl`).
 */
export const OrgUnitFilterControl: FC<Props> = ({
    value,
    onChange,
    orgUnits,
    onResize,
}) => {
    const { formatMessage } = useSafeIntl();
    const theme = useTheme();

    const selection = normalizeSelection(value);
    const expanded = value?.expanded ?? true;

    const update = useCallback(
        (next: OrgUnitSelection) => onChange({ ...next, expanded }),
        [onChange, expanded],
    );
    const updateExpanded = useCallback(
        (next: boolean) => onChange({ ...selection, expanded: next }),
        [onChange, selection],
    );

    const allOrgUnitIds = useMemo(
        () => orgUnits.map(orgUnit => orgUnit.id),
        [orgUnits],
    );
    const selectedIds = useMemo(
        () => resolveSelectedOrgUnitIds(selection, allOrgUnitIds),
        [selection, allOrgUnitIds],
    );

    const getOrgUnitMapMisc = useCallback(
        (orgUnitId: number) => ({
            label: undefined,
            color: isOrgUnitSelected(selection, orgUnitId)
                ? theme.palette.primary.main
                : mapTheme.shapeColor,
        }),
        [selection, theme],
    );

    return (
        <Box
            sx={styles.root}
            // Stop Flume from turning clicks/typing into a node drag (mirrors its built-in inputs).
            onMouseDown={e => e.stopPropagation()}
        >
            <select
                value={selection.mode}
                onChange={e =>
                    update(
                        setSelectionMode(
                            selection,
                            e.target.value as OrgUnitSelectionMode,
                        ),
                    )
                }
            >
                <option value="all">
                    {formatMessage(MESSAGES.filterModeAll)}
                </option>
                <option value="none">
                    {formatMessage(MESSAGES.filterModeNone)}
                </option>
            </select>
            <Box component="p" sx={styles.summary}>
                {formatMessage(MESSAGES.filterSelectionSummary, {
                    selected: selectedIds.length.toString(),
                    total: allOrgUnitIds.length.toString(),
                })}
            </Box>
            <CollapsibleMapPreview
                label={formatMessage(MESSAGES.filterEditDistricts)}
                orgUnits={orgUnits}
                getOrgUnitMapMisc={getOrgUnitMapMisc}
                selectedOrgUnitIds={selectedIds}
                selectedBorderColor={theme.palette.primary.main}
                defaultExpanded={expanded}
                onExpandedChange={updateExpanded}
                onResize={onResize}
                onOrgUnitClick={orgUnitId =>
                    update(toggleOrgUnit(selection, orgUnitId))
                }
                dialogSidePanel={
                    <OrgUnitSelectionPanel
                        value={selection}
                        onChange={update}
                        orgUnits={orgUnits}
                    />
                }
            />
        </Box>
    );
};
