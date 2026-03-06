import { FC, useEffect, useRef } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';

type Props = {
    bounds: L.LatLngBounds | undefined;
    boundsOptions?: L.FitBoundsOptions;
};

export const ResetZoomControl: FC<Props> = ({ bounds, boundsOptions = {} }) => {
    const map = useMap();
    const controlRef = useRef<L.Control | null>(null);
    const boundsRef = useRef(bounds);
    const optsRef = useRef(boundsOptions);
    boundsRef.current = bounds;
    optsRef.current = boundsOptions;

    useEffect(() => {
        const ResetControl = L.Control.extend({
            onAdd() {
                const btn = L.DomUtil.create('a', 'leaflet-control-zoom-reset');
                btn.href = '#';
                btn.role = 'button';
                btn.title = 'Reset zoom';
                btn.setAttribute('aria-label', 'Reset zoom');
                btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 4V1h3M10 1h3v3M13 10v3h-3M4 13H1v-3"/></svg>';

                L.DomEvent.disableClickPropagation(btn);
                L.DomEvent.on(btn, 'click', (e: Event) => {
                    e.preventDefault();
                    if (boundsRef.current) {
                        map.fitBounds(boundsRef.current, optsRef.current);
                    }
                });

                return btn;
            },
        });

        const zoomContainer = map
            .getContainer()
            .querySelector('.leaflet-control-zoom');

        if (zoomContainer) {
            const btn = new ResetControl().onAdd(map);
            zoomContainer.appendChild(btn);
            controlRef.current = btn as unknown as L.Control;
        }

        return () => {
            if (controlRef.current) {
                (controlRef.current as unknown as HTMLElement).remove();
            }
        };
    }, [map]);

    return null;
};
