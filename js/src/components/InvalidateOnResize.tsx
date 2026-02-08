import { FC, useEffect } from 'react';
import { useMap } from 'react-leaflet';

/**
 * Calls `map.invalidateSize()` whenever the map container is resized.
 * Place this inside a `<MapContainer>` to handle dynamic layout changes
 * (e.g. sidebar open/close) that Leaflet can't detect on its own.
 */
export const InvalidateOnResize: FC = () => {
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
