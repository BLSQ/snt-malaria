import { FC, useEffect } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';

const TILE_URL =
    'http://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
const ATTRIBUTION =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

type AnimatingMap = L.Map & {
    _animatingZoom?: boolean;
    _animateToZoom: number;
};

type GridLayerInternals = {
    _map: AnimatingMap | undefined;
    _update: (center?: L.Point) => void;
};

const baseUpdate = (L.TileLayer.prototype as unknown as GridLayerInternals)
    ._update;

// Leaflet 1.9 reads the pre-animation zoom in `_update` during `zoomanim`, so a
// zoom of more than one level resets the grid and prunes the visible tiles.
const ZoomAnimationSafeTileLayer = L.TileLayer.extend({
    _update(this: GridLayerInternals, center?: L.Point) {
        const map = this._map;
        if (!map?._animatingZoom) {
            baseUpdate.call(this, center);
            return;
        }
        map.getZoom = () => map._animateToZoom;
        try {
            baseUpdate.call(this, center);
        } finally {
            delete (map as Partial<AnimatingMap>).getZoom;
        }
    },
}) as unknown as new (url: string, options?: L.TileLayerOptions) => L.TileLayer;

export const MapTypeLayer: FC = () => {
    const map = useMap();

    useEffect(() => {
        const layer = new ZoomAnimationSafeTileLayer(TILE_URL, {
            attribution: ATTRIBUTION,
        }).addTo(map);
        return () => {
            layer.remove();
        };
    }, [map]);

    return null;
};
