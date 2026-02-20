import { FC, useEffect } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';

/**
 * Fits the map to the given bounds whenever they change.
 * Place this inside a `<MapContainer>` — react-leaflet treats
 * `bounds` on MapContainer as an immutable prop, so this component
 * is needed to react to bound changes (e.g. when filtered org units change).
 */
export const FitBounds: FC<{
    bounds: L.LatLngBounds | undefined;
    boundsOptions?: L.FitBoundsOptions;
}> = ({ bounds, boundsOptions = {} }) => {
    const map = useMap();

    useEffect(() => {
        if (bounds && map) {
            map.fitBounds(bounds, boundsOptions);
        }
    }, [bounds, boundsOptions, map]);

    return null;
};
