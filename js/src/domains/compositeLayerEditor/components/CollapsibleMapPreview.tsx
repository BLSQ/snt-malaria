import React, { FC, useCallback, useEffect, useId, useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import {
    Box,
    Collapse,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Tooltip,
} from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';
import { Map as SNTMap } from '../../../components/Map';
import { mapTheme } from '../../../constants/map-theme';
import { MetricType, MetricValue } from '../../dataLayers/types/metrics';
import {
    getMapStyleForOrgUnit,
    useGetOrgUnitMetric,
} from '../../planning/libs/map-utils';
import { MESSAGES } from '../messages';

// Render the thumbnail "zoomed out": lay it out at 1/scale the visible size, then CSS-scale it back
// down so more of the map (and smaller shapes) fit in the little preview.
const MAP_SCALE = 0.5;
const INVERSE_SCALE_PCT = `${100 / MAP_SCALE}%`;
// The node grows/shrinks over MUI's Collapse animation; keep redrawing connections for its duration.
const RESIZE_REDRAW_MS = 350;

const defaultOrgUnitStyle = {
    label: '',
    color: mapTheme.shapeColor,
};

// Chevron caret for the native <select>, drawn as an inline SVG data URI.
const SELECT_CARET_SVG =
    'url("data:image/svg+xml;charset=utf-8,' +
    "%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E" +
    "%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%23888' stroke-width='1.5'/%3E%3C/svg%3E\")";

/** Minimal legend shape needed to colour the choropleth (a real MetricType satisfies it too). */
export type LegendConfigLike = Pick<
    MetricType,
    'legend_type' | 'legend_config'
> &
    Partial<Pick<MetricType, 'units' | 'unit_symbol'>>;

const styles = {
    toggle: {
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        width: '100%',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        padding: theme => theme.spacing(0.25, 0),
        color: 'text.secondary',
        font: 'inherit',
        fontSize: theme => theme.typography.pxToRem(12),
        '&:disabled': { cursor: 'default', opacity: 0.6 },
    },
    toggleIcon: { fontSize: 16 },
    chevron: {
        fontSize: 18,
        marginLeft: 'auto',
        transition: 'transform 150ms ease',
    },
    chevronOpen: { transform: 'rotate(180deg)' },
    // Year picker overlaid on the map, mirroring the expand button but on the top-left.
    yearSelect: {
        position: 'absolute',
        top: 4,
        left: 4,
        zIndex: 600,
        // Flex so the <select> sits flush with the box's top-left (no inline baseline gap), giving
        // it the exact same 4px inset from the map border as the expand button opposite it.
        display: 'flex',
        // Native <select> (not MUI): its dropdown is browser-rendered, so it's unaffected by the
        // editor's CSS `transform: scale(...)`, unlike an MUI portal. We strip the native appearance
        // so it matches the app theme (size, colours, focus) instead of the OS control chrome, and
        // draw our own caret.
        '& select': {
            appearance: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            // Match the expand button's box (14px icon + 2*4px padding + 2*1px border = 24px).
            height: 24,
            boxSizing: 'border-box',
            backgroundColor: theme => theme.palette.background.paper,
            backgroundImage: SELECT_CARET_SVG,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 6px center',
            color: theme => theme.palette.text.primary,
            border: theme => `1px solid ${theme.palette.divider}`,
            borderRadius: theme => `${theme.shape.borderRadius}px`,
            // Extra right padding leaves room for the caret drawn above.
            padding: theme => theme.spacing(0, 2.5, 0, 0.75),
            fontSize: theme => theme.typography.pxToRem(12),
            cursor: 'pointer',
            outline: 'none',
            '&:focus-visible': {
                borderColor: theme => theme.palette.primary.main,
            },
        },
    },
    mapBox: {
        position: 'relative',
        width: '100%',
        // 4:3 preview thumbnail.
        aspectRatio: '4 / 3',
        mt: 0.5,
        borderRadius: theme => `${theme.shape.borderRadius}px`,
        overflow: 'hidden',
        border: theme => `1px solid ${theme.palette.divider}`,
    },
    // Sized at 1/scale so that, once scaled back down, it exactly fills `mapBox`.
    mapScale: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: INVERSE_SCALE_PCT,
        height: INVERSE_SCALE_PCT,
        transform: `scale(${MAP_SCALE})`,
        transformOrigin: 'top left',
    },
    expandButton: {
        position: 'absolute',
        top: 4,
        right: 4,
        zIndex: 600,
        padding: 0.5,
        backgroundColor: theme => theme.palette.background.paper,
        border: theme => `1px solid ${theme.palette.divider}`,
        color: 'text.secondary',
        '&:hover': { backgroundColor: theme => theme.palette.action.hover },
    },
    expandIcon: { fontSize: 14 },
    overlay: {
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 1,
        backgroundColor: theme => theme.palette.background.paper,
        color: 'text.secondary',
        fontSize: theme => theme.typography.pxToRem(12),
        zIndex: 500,
    },
    dialogTitle: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
    },
    dialogContent: {
        height: '70vh',
        p: 0,
    },
    dialogMap: {
        height: '100%',
        width: '100%',
    },
} satisfies SxStyles;

type Props = {
    /** Toggle text shown when the preview is available. */
    label: string;
    /** When true the toggle is disabled and the map can't be opened. */
    disabled?: boolean;
    /** Toggle text shown while `disabled`. */
    disabledLabel?: string;
    orgUnits: OrgUnit[];
    metricValues?: MetricValue[];
    /** Drives the choropleth colours; a full MetricType works here too. */
    legendConfig?: LegendConfigLike;
    /** When set (and expanded), shown as a centred overlay instead of the map (loading/error/empty). */
    statusMessage?: string;
    defaultExpanded?: boolean;
    /** Called with the new expanded state so parents can gate work (e.g. data fetching). */
    onExpandedChange?: (expanded: boolean) => void;
    /** Recomputes Flume's connection curves; called while the node resizes. */
    onResize?: () => void;
    /** When the source data spans multiple years, the years to choose from (shown as a dropdown). */
    yearOptions?: number[];
    /** Currently selected year (one of `yearOptions`). */
    selectedYear?: number;
    /** Called when the user picks a different year. */
    onYearChange?: (year: number) => void;
};

/**
 * A small, collapsible, controls-free Leaflet map thumbnail embedded inside a node. It reuses the
 * app's `Map` component so the preview renders exactly like the full-size map, choropleth colours
 * and all. An expand button opens the same map, full-size and interactive, in a dialog.
 */
export const CollapsibleMapPreview: FC<Props> = ({
    label,
    disabled = false,
    disabledLabel,
    orgUnits,
    metricValues,
    legendConfig,
    statusMessage,
    defaultExpanded = false,
    onExpandedChange,
    onResize,
    yearOptions,
    selectedYear,
    onYearChange,
}) => {
    const { formatMessage } = useSafeIntl();
    const [expanded, setExpanded] = useState(defaultExpanded);
    const [hasToggled, setHasToggled] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    // Unique DOM id per instance so multiple node maps don't collide on the MapContainer id.
    const mapId = useId();

    // Keep the connection wires glued to the ports while the node resizes (expand/collapse).
    useEffect(() => {
        if (!hasToggled || !onResize) return undefined;
        const start = performance.now();
        let frame = requestAnimationFrame(function tick(now) {
            onResize();
            if (now - start < RESIZE_REDRAW_MS) {
                frame = requestAnimationFrame(tick);
            }
        });
        return () => cancelAnimationFrame(frame);
    }, [expanded, hasToggled, onResize]);

    const getSelectedMetric = useGetOrgUnitMetric(metricValues);
    const getOrgUnitMapMisc = useCallback(
        (orgUnitId: number) => {
            if (!legendConfig) return defaultOrgUnitStyle;
            return getMapStyleForOrgUnit(
                legendConfig as MetricType,
                getSelectedMetric(orgUnitId),
            );
        },
        [legendConfig, getSelectedMetric],
    );

    const toggle = () => {
        setHasToggled(true);
        setExpanded(prev => {
            const next = !prev;
            onExpandedChange?.(next);
            return next;
        });
    };

    return (
        <Box>
            <Box
                component="button"
                type="button"
                sx={styles.toggle}
                disabled={disabled}
                onClick={toggle}
                // Keep clicks/drags from reaching Flume's node-drag handler.
                onMouseDown={e => e.stopPropagation()}
            >
                <MapOutlinedIcon sx={styles.toggleIcon} />
                {disabled ? (disabledLabel ?? label) : label}
                <ExpandMoreIcon
                    sx={[styles.chevron, expanded && styles.chevronOpen]}
                />
            </Box>
            <Collapse in={expanded && !disabled} unmountOnExit>
                <Box
                    sx={styles.mapBox}
                    onMouseDown={e => e.stopPropagation()}
                    onWheel={e => e.stopPropagation()}
                >
                    <Box sx={styles.mapScale}>
                        <SNTMap
                            id={`composite-node-map-${mapId}`}
                            orgUnits={orgUnits}
                            legendConfig={legendConfig as MetricType}
                            getOrgUnitMapMisc={getOrgUnitMapMisc}
                            hideLegend
                            hideControls
                            disableInteractions
                        />
                    </Box>
                    {!statusMessage &&
                        yearOptions &&
                        yearOptions.length > 0 && (
                            <Box
                                sx={styles.yearSelect}
                                onMouseDown={e => e.stopPropagation()}
                            >
                                <select
                                    value={selectedYear ?? ''}
                                    aria-label={formatMessage(MESSAGES.year)}
                                    onChange={e =>
                                        onYearChange?.(Number(e.target.value))
                                    }
                                >
                                    {yearOptions.map(yearOption => (
                                        <option
                                            key={yearOption}
                                            value={yearOption}
                                        >
                                            {yearOption}
                                        </option>
                                    ))}
                                </select>
                            </Box>
                        )}
                    {!statusMessage && (
                        <Tooltip
                            title={formatMessage(MESSAGES.openLargerPreview)}
                        >
                            <IconButton
                                sx={styles.expandButton}
                                onClick={() => setDialogOpen(true)}
                                onMouseDown={e => e.stopPropagation()}
                            >
                                <OpenInFullIcon sx={styles.expandIcon} />
                            </IconButton>
                        </Tooltip>
                    )}
                    {statusMessage && (
                        <Box sx={styles.overlay}>{statusMessage}</Box>
                    )}
                </Box>
            </Collapse>

            <Dialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle sx={styles.dialogTitle}>
                    {label}
                    <IconButton
                        size="small"
                        onClick={() => setDialogOpen(false)}
                        aria-label={formatMessage(MESSAGES.close)}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={styles.dialogContent}>
                    {dialogOpen && (
                        <Box
                            sx={styles.dialogMap}
                            // The dialog is portaled but still bubbles React events through the
                            // Flume node tree, so a map drag would otherwise start Flume's node-drag
                            // and pan the canvas (fighting Leaflet -> jump-back). Only swallow the
                            // initiating mousedown: stopping mousemove/mouseup here would also block
                            // them from reaching `document`, where Leaflet listens during a drag.
                            onMouseDown={e => e.stopPropagation()}
                            onWheel={e => e.stopPropagation()}
                        >
                            <SNTMap
                                id={`composite-node-map-dialog-${mapId}`}
                                orgUnits={orgUnits}
                                legendConfig={legendConfig as MetricType}
                                getOrgUnitMapMisc={getOrgUnitMapMisc}
                            />
                        </Box>
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    );
};
