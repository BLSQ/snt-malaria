import { FC, RefObject, useEffect, useMemo } from 'react';
import { useMapEvents } from 'react-leaflet';
import { MapHoverCardHandle } from './MapHoverCard';

type Props = {
    hoverCardRef: RefObject<MapHoverCardHandle>;
    /** Changes whenever the map's shapes are replaced. */
    shapes: unknown;
};

export const MapHoverCardEvents: FC<Props> = ({ hoverCardRef, shapes }) => {
    const handlers = useMemo(() => {
        const forgetCoverage = () => hoverCardRef.current?.forgetCoverage();
        const unpin = () => hoverCardRef.current?.unpin();
        return {
            movestart: unpin,
            click: unpin,
            moveend: forgetCoverage,
            zoomend: forgetCoverage,
            resize: forgetCoverage,
        };
    }, [hoverCardRef]);
    useMapEvents(handlers);

    useEffect(() => {
        hoverCardRef.current?.forgetCoverage();
        hoverCardRef.current?.unpin();
    }, [hoverCardRef, shapes]);

    return null;
};
