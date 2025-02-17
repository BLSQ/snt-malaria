import React, { FC, useMemo, useState } from 'react';
import { Box, useTheme, Button, styled } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import L from 'leaflet';
import { GeoJSON, MapContainer, ZoomControl } from 'react-leaflet';
import { CustomTileLayer } from 'Iaso/components/maps/tools/CustomTileLayer';
import { Tile } from 'Iaso/components/maps/tools/TilesSwitchControl';
import { GeoJson } from 'Iaso/components/maps/types';
import tiles from 'Iaso/constants/mapTiles';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { Bounds } from 'Iaso/utils/map/mapUtils';
import { MESSAGES } from '../messages';

const StyledButton = styled(Button)`
    background-color: white;
    color: ${({ theme }) => theme.palette.text.primary};
    position: absolute;
    top: 16px;
    left: 16px;
    z-index: 1000;
    border: 2px solid rgba(0, 0, 0, 0.2);
    &:hover {
        background-color: #f5f5f5;
        border: 2px solid rgba(0, 0, 0, 0.3);
    }
`;

type Props = {
    orgUnits?: OrgUnit[];
    toggleDrawer: () => void;
};

export const Map: FC<Props> = ({ orgUnits, toggleDrawer }) => {
    const [currentTile, setCurrentTile] = useState<Tile>(tiles.osm);
    const theme = useTheme();
    const { formatMessage } = useSafeIntl();
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

    // Selecting an org unit on the map
    const [selectedOrgUnit, setSelectedOrgUnit] = useState<OrgUnit | null>(
        null,
    );
    const onOrgUnitClick = (orgUnitId: number) => {
        const orgUnit = orgUnits?.find(ou => ou.id === orgUnitId);
        setSelectedOrgUnit(orgUnit || null);
    };

    return (
        <Box
            height="100%"
            sx={{
                borderRadius: theme.spacing(2),
                overflow: 'hidden',
                position: 'relative',
            }}
        >
            <StyledButton
                variant="outlined"
                size="small"
                onClick={toggleDrawer}
            >
                {formatMessage(MESSAGES.layers)}
            </StyledButton>
            {orgUnits && (
                <>
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
                                eventHandlers={{
                                    click: () => onOrgUnitClick(orgUnit.id),
                                }}
                            />
                        ))}
                    </MapContainer>
                    {selectedOrgUnit && (
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 10,
                                right: 10,
                                backgroundColor: '#333D43',
                                color: 'white',
                                padding: '10px',
                                borderRadius: '16px',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                                zIndex: 1000,
                            }}
                        >
                            <h3>{selectedOrgUnit.name}</h3>
                        </Box>
                    )}
                </>
            )}
        </Box>
    );
};
