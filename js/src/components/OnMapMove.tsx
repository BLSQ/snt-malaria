import { FC } from 'react';
import { useMapEvents } from 'react-leaflet';

type Props = {
    onMove: () => void;
};

export const OnMapMove: FC<Props> = ({ onMove }) => {
    useMapEvents({ moveend: onMove, zoomend: onMove, resize: onMove });
    return null;
};
