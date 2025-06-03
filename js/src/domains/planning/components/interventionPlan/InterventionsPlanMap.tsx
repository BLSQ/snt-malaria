import React, { FunctionComponent, useMemo, useState } from 'react';
import { Box, MenuItem, Select, Theme, Typography } from '@mui/material';
import { Tile } from 'Iaso/components/maps/tools/TilesSwitchControl';
import { GeoJson } from 'Iaso/components/maps/types';
import tiles from 'Iaso/constants/mapTiles';
import { SxStyles } from 'Iaso/types/general';
import { Bounds } from 'Iaso/utils/map/mapUtils';
import L from 'leaflet';
import { MapContainer, GeoJSON, ZoomControl } from 'react-leaflet';
import { useGetOrgUnits } from '../../hooks/useGetOrgUnits';

const styles: SxStyles = {
    mainBox: (theme: Theme) => ({
        borderRadius: theme.spacing(2),
        marginBottom: theme.spacing(1),
        overflow: 'hidden',
        position: 'relative',
    }),
    select: (theme: Theme) => ({
        minWidth: 120,
        '& .MuiSelect-select': { padding: '8px 12px' },
        backgroundColor: 'white',
        borderRadius: theme.spacing(1),
        height: '32px',
        '& .MuiOutlinedInput-notchedOutline': {
            border: 0,
        },
    }),
    legendBox: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        zIndex: 1000,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        height: '25px',
        width: '100px',
        borderRadius: 2,
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
    },
    legendShape: {
        backgroundColor: '#9575CD',
        height: '12px',
        width: '12px',
        marginRight: '8px',
        borderRadius: '2px',
    },
    selectBox: {
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 1000,
        backgroundColor: 'white',
        borderRadius: 2,
        border: 'none',
    },
};
export const InterventionsPlanMap: FunctionComponent = () => {
    const { data: orgUnits } = useGetOrgUnits();
    const [currentTile] = useState<Tile>(tiles.osm);
    const boundsOptions: Record<string, any> = {
        padding: [-10, -10],
        maxZoom: currentTile.maxZoom,
    };
    const bounds: Bounds | undefined = useMemo(() => {
        const geoJsonFeatures = orgUnits
            ?.filter(orgUnit => orgUnit.geo_json)
            .map(orgUnit => orgUnit.geo_json);
        if (geoJsonFeatures?.length === 0) return undefined;
        const shape = L.geoJSON(geoJsonFeatures);
        return shape.getBounds();
    }, [orgUnits]);

    return (
        <Box height="390px" width="100%" sx={styles.mainBox}>
            <MapContainer
                id="side_map"
                doubleClickZoom
                scrollWheelZoom={false}
                maxZoom={currentTile.maxZoom}
                style={{
                    height: '100%',
                    width: '100%',
                    backgroundColor: '#ECEFF1',
                }}
                center={[0, 0]}
                keyboard={false}
                zoomControl={false}
                boundsOptions={boundsOptions}
                bounds={bounds}
            >
                <ZoomControl
                    position="bottomright"
                    backgroundColor="#1F2B3DBF"
                />
                {orgUnits?.map((orgUnit, index) => (
                    <GeoJSON
                        key={orgUnit.id}
                        data={orgUnit.geo_json as unknown as GeoJson}
                        style={{
                            color: 'var(--text-primary,#1F2B3DDE)',
                            weight: 1,
                            fillColor:
                                index < 5
                                    ? 'var(--deepPurple-300, #9575CD)'
                                    : '#ECEFF1',
                            fillOpacity: 2,
                        }}
                    />
                ))}
            </MapContainer>
            <Box sx={styles.selectBox}>
                <Select
                    value=""
                    onChange={() => null}
                    displayEmpty
                    sx={styles.select}
                >
                    <MenuItem value="">
                        <Typography variant="body2">Base Pack</Typography>
                    </MenuItem>
                </Select>
            </Box>
            <Box sx={styles.legendBox}>
                <Box sx={styles.legendShape} />
                <Typography variant="caption" sx={{ color: 'white' }}>
                    4 districts
                </Typography>
            </Box>
        </Box>
    );
};
