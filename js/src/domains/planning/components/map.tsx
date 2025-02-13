import React, { FC, useMemo, useState } from 'react';
import { Box, useTheme } from '@mui/material';
import L from 'leaflet';
import { MapContainer, GeoJSON, ZoomControl } from 'react-leaflet';
import { CustomTileLayer } from 'Iaso/components/maps/tools/CustomTileLayer';
import { Tile } from 'Iaso/components/maps/tools/TilesSwitchControl';
import { GeoJson } from 'Iaso/components/maps/types';
import tiles from 'Iaso/constants/mapTiles';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { Bounds } from 'Iaso/utils/map/mapUtils';

export const Map: FC<{ orgUnits?: OrgUnit[] }> = ({ orgUnits }) => {
    const [currentTile, setCurrentTile] = useState<Tile>(tiles.osm);
    const theme = useTheme();
    const boundsOptions: Record<string, any> = {
        padding: [10, 10],
        maxZoom: currentTile.maxZoom,
    };
    const bounds: Bounds | undefined = useMemo(() => {
        if (!orgUnits?.length) return undefined;
        const geoJsonFeatures = orgUnits
            .filter(orgUnit => orgUnit.geo_json)
            .map(orgUnit => orgUnit.geo_json);
        if (geoJsonFeatures.length === 0) return undefined;
        const shape = L.geoJSON(geoJsonFeatures);
        return shape.getBounds();
    }, [orgUnits]);
    return (
        <Box
            height="100%"
            sx={{ borderRadius: theme.spacing(2), overflow: 'hidden' }}
        >
            {orgUnits && (
                <MapContainer
                    doubleClickZoom
                    scrollWheelZoom={false}
                    maxZoom={currentTile.maxZoom}
                    style={{ height: '100%' }}
                    center={[0, 0]}
                    keyboard={false}
                    bounds={bounds}
                    boundsOptions={boundsOptions}
                    zoomControl={false}
                >
                    <ZoomControl position="bottomleft" />
                    <CustomTileLayer
                        currentTile={currentTile}
                        setCurrentTile={setCurrentTile}
                    />
                    {orgUnits.map(orgUnit => (
                        <GeoJSON
                            key={orgUnit.id}
                            style={{
                                color: theme.palette.primary.main,
                            }}
                            data={orgUnit.geo_json as unknown as GeoJson}
                        />
                    ))}
                </MapContainer>
            )}
        </Box>
    );
};
