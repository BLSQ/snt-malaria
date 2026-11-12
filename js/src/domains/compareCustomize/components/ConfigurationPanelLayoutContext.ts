import { createContext, useContext } from 'react';
import { noOp } from 'Iaso/utils';

type ConfigurationPanelLayout = {
    scrollContainer: HTMLElement | null;
    /** Layer above the scrolling content, spanning the whole panel including its scrollbar. */
    pinnedLayer: HTMLElement | null;
    /** Height the pinned layer covers at the bottom of the panel, kept clear when content above it is scrolled into view. */
    setPinnedBottomHeight: (height: string | undefined) => void;
};

export const ConfigurationPanelLayoutContext =
    createContext<ConfigurationPanelLayout>({
        scrollContainer: null,
        pinnedLayer: null,
        setPinnedBottomHeight: noOp,
    });

export const useConfigurationPanelLayout = (): ConfigurationPanelLayout =>
    useContext(ConfigurationPanelLayoutContext);
