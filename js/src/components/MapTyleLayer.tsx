import React, { FC } from 'react';
import { TileLayer } from 'react-leaflet';
export const MapTypeLayer: FC = () => (
    <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="http://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
    />
);
