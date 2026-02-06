import { FC, useEffect } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';

/**
 * Calls `map.invalidateSize()` whenever the map container is resized.
 * Place this inside a `<MapContainer>` to handle dynamic layout changes
 * (e.g. sidebar open/close) that Leaflet can't detect on its own.
 */
export const InvalidateOnResize = () => {
    const map = useMap();

    useEffect(() => {
        const container = map.getContainer();
        const observer = new ResizeObserver(() => {
            map.invalidateSize();
        });
        observer.observe(container);
        return () => observer.disconnect();
    }, [map]);

    return null;
};

/**
 * Fits the map to the given bounds whenever they change.
 * Place this inside a `<MapContainer>` — react-leaflet treats
 * `bounds` on MapContainer as an immutable prop, so this component
 * is needed to react to bound changes (e.g. when filtered org units change).
 */
export const FitBounds: FC<{
    bounds: L.LatLngBounds | undefined;
    boundsOptions?: Record<string, any>;
}> = ({ bounds, boundsOptions = {} }) => {
    const map = useMap();

    useEffect(() => {
        if (bounds && map) {
            map.fitBounds(bounds, boundsOptions);
        }
    }, [bounds, boundsOptions, map]);

    return null;
};
