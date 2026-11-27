import { SyntheticEvent } from 'react';

const mapPanelEvents = new WeakSet<Event>();

export const markMapPanelEvent = (event: SyntheticEvent) => {
    mapPanelEvents.add(event.nativeEvent);
};

export const isMapPanelEvent = (event: Event) => mapPanelEvents.has(event);
