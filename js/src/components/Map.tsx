import React, {
    FC,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import L from 'leaflet';
import { MapContainer, ZoomControl, Pane } from 'react-leaflet';
import { Tile } from 'Iaso/components/maps/tools/TilesSwitchControl';
import tiles from 'Iaso/constants/mapTiles';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';
import { noOp } from 'Iaso/utils';
import { Bounds, orderOrgUnitsByDepth } from 'Iaso/utils/map/mapUtils';
import { MapLegend } from '../components/MapLegend';
import { mapTheme } from '../constants/map-theme';
import {
    defaultZoomDelta,
    defaultZoomSnap,
} from '../domains/planning/libs/map-utils';
import { FitBounds } from './FitBounds';
import {
    MapHover,
    MapHoverCard,
    MapHoverCardContent,
    MapHoverCardHandle,
} from './hoverCard/MapHoverCard';
import { InvalidateOnResize } from './InvalidateOnResize';
import { MapGeoJSON } from './MapGeoJSON';
import { MapTypeLayer } from './MapTyleLayer';
import { OnMapMove } from './OnMapMove';
import { ResetZoomControl } from './ResetZoomControl';

const styles = {
    root: {
        height: '100%',
        width: '100%',
        backgroundColor: mapTheme.backgroundColor,
        '& .leaflet-control-zoom': {
            border: 'none',
            boxShadow: 'none',
            backgroundColor: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            gap: theme => theme.spacing(0.25),
            marginBottom: 1,
            marginRight: 1,
        },
        '& .leaflet-control-zoom a': {
            backgroundColor: theme => alpha(theme.palette.text.primary, 0.75),
            color: 'common.white',
            border: 'none',
            minWidth: theme => theme.spacing(3.5),
            minHeight: theme => theme.spacing(3.5),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: theme => `${theme.shape.borderRadius}px !important`,
            fontSize: theme => theme.typography.pxToRem(22),
            lineHeight: '1 !important',
            textIndent: '0 !important',
            margin: 0,
            padding: 0,
        },
        '& .leaflet-control-zoom a span': {
            display: 'block',
            lineHeight: 0,
            transform: 'translateY(-2px)',
        },
        '& .leaflet-control-zoom-box': {
            display: 'none !important',
        },
        '& .leaflet-control-zoom-rect': {
            display: 'none !important',
        },
        '& .leaflet-control-zoom a img': {
            margin: '0 !important',
        },
        '& .leaflet-control-attribution': {
            display: 'none',
        },
    },
    bordered: {
        borderRadius: theme => `${theme.shape.borderRadius * 2}px`,
        overflow: 'hidden',
        border: theme => `1px solid ${theme.palette.divider}`,
    },
} satisfies SxStyles;

type Props = {
    id: string;
    orgUnits: OrgUnit[];
    getOrgUnitMapMisc: (orgUnitId: number) => {
        label: string | number | undefined;
        color: string | undefined;
    };
    /** Content of the hover card; defaults to the org unit's map label. */
    getTooltipContent?: (orgUnit: OrgUnit) => MapHoverCardContent;
    legendConfig?: {
        units: string;
        legend_type: string; //'linear' | 'ordinal' | 'threshold';
        legend_config: {
            domain: number[] | string[];
            range: string[];
        };
        unit_symbol: string;
    };
    hideLegend?: boolean;
    defaultColor?: string;
    selectedOrgUnitIds?: number[];
    /** When set, only these org units are drawn and the map fits to them; when empty, the view is kept. */
    visibleOrgUnitIds?: number[];
    onOrgUnitClick?: (orgUnitId: number) => void;
    /** Optional key fragment appended to each GeoJSON key to force style refresh. */
    dataKey?: string;
    /** When true, adds rounded corners and a border around the map. */
    border?: boolean;
    /** When true, hides the zoom / reset-zoom controls (e.g. for a static thumbnail preview). */
    hideControls?: boolean;
    /** When true, disables all user interaction (drag, zoom, keyboard) for a static thumbnail. */
    disableInteractions?: boolean;
};
export const Map: FC<Props> = ({
    id,
    orgUnits,
    getOrgUnitMapMisc,
    legendConfig,
    hideLegend = false,
    defaultColor = 'var(--deepPurple-300, #9575CD)',
    selectedOrgUnitIds,
    visibleOrgUnitIds,
    onOrgUnitClick = noOp,
    dataKey,
    border = false,
    getTooltipContent,
    hideControls = false,
    disableInteractions = false,
}) => {
    const [currentTile] = useState<Tile>(tiles.osm);

    const boundsOptions: Record<string, any> = useMemo(
        () => ({
            padding: [-10, -10],
            maxZoom: currentTile.maxZoom,
        }),
        [currentTile.maxZoom],
    );

    const orderedOrgUnits = useMemo(
        () => orderOrgUnitsByDepth(orgUnits || []),
        [orgUnits],
    );

    // Only render the leaf org units (deepest depth level) to avoid stacking
    // semi-transparent shapes from multiple hierarchy levels on top of each
    // other, which compounds opacity and hides the tile layer.
    const leafOrgUnits = useMemo(() => {
        if (orderedOrgUnits.length === 0) return orderedOrgUnits;
        const maxDepth = orderedOrgUnits.reduce(
            (max, ou) => Math.max(max, ou.org_unit_type_depth ?? 0),
            0,
        );
        const visibleIds = visibleOrgUnitIds
            ? new Set(visibleOrgUnitIds)
            : undefined;
        return orderedOrgUnits.filter(
            ou =>
                (ou.org_unit_type_depth ?? 0) === maxDepth &&
                (!visibleIds || visibleIds.has(ou.id)),
        );
    }, [orderedOrgUnits, visibleOrgUnitIds]);

    const bounds: Bounds | undefined = useMemo(() => {
        const geoJsonFeatures = leafOrgUnits
            ?.filter(orgUnit => orgUnit?.geo_json)
            .map(orgUnit => orgUnit?.geo_json);
        if (geoJsonFeatures?.length === 0) return undefined;
        const shape = L.geoJSON(geoJsonFeatures);
        return shape.getBounds();
    }, [leafOrgUnits]);

    const selectedIds = useMemo(
        () => (selectedOrgUnitIds ? new Set(selectedOrgUnitIds) : undefined),
        [selectedOrgUnitIds],
    );

    const hoverCardRef = useRef<MapHoverCardHandle>(null);
    const handleOrgUnitHover = useCallback(
        (hover: MapHover | null) => hoverCardRef.current?.update(hover),
        [],
    );
    const forgetHoverCardCoverage = useCallback(
        () => hoverCardRef.current?.forgetCoverage(),
        [],
    );
    useEffect(forgetHoverCardCoverage, [leafOrgUnits, forgetHoverCardCoverage]);
    const getHoverCardContent = useCallback(
        (orgUnit: OrgUnit): MapHoverCardContent => {
            if (getTooltipContent) {
                return getTooltipContent(orgUnit);
            }
            const { label } = getOrgUnitMapMisc(orgUnit.id);
            return {
                body:
                    label != null && label !== '' ? (
                        <Typography variant="body2">{label}</Typography>
                    ) : undefined,
            };
        },
        [getTooltipContent, getOrgUnitMapMisc],
    );

    return (
        <Box sx={border ? [styles.root, styles.bordered] : styles.root}>
            <MapContainer
                id={id}
                style={{
                    height: '100%',
                    width: '100%',
                }}
                doubleClickZoom={!disableInteractions}
                scrollWheelZoom={false}
                dragging={!disableInteractions}
                touchZoom={!disableInteractions}
                boxZoom={!disableInteractions}
                maxZoom={currentTile.maxZoom}
                center={[0, 0]}
                keyboard={false}
                zoomControl={false}
                boundsOptions={boundsOptions}
                bounds={bounds}
                zoomSnap={defaultZoomSnap}
                zoomDelta={defaultZoomDelta}
            >
                <MapTypeLayer />
                <OnMapMove onMove={forgetHoverCardCoverage} />
                <InvalidateOnResize
                    bounds={bounds}
                    boundsOptions={boundsOptions}
                />
                <FitBounds bounds={bounds} boundsOptions={boundsOptions} />
                {!hideControls && (
                    <>
                        <ZoomControl position="bottomright" />
                        <ResetZoomControl
                            bounds={bounds}
                            boundsOptions={boundsOptions}
                        />
                    </>
                )}
                <Pane name="root">
                    {leafOrgUnits.map(orgUnit => (
                        <MapGeoJSON
                            key={orgUnit.id}
                            dataKey={dataKey}
                            orgUnit={orgUnit}
                            orgUnitMapMisc={getOrgUnitMapMisc(orgUnit.id)}
                            defaultColor={defaultColor}
                            isSelected={selectedIds?.has(orgUnit.id)}
                            onOrgUnitClick={onOrgUnitClick}
                            onOrgUnitHover={
                                disableInteractions
                                    ? undefined
                                    : handleOrgUnitHover
                            }
                        />
                    ))}
                </Pane>
                {legendConfig && !hideLegend && (
                    <MapLegend legendConfig={legendConfig} />
                )}
            </MapContainer>
            {!disableInteractions && (
                <MapHoverCard
                    ref={hoverCardRef}
                    getContent={getHoverCardContent}
                />
            )}
        </Box>
    );
};
