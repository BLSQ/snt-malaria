export type ComparisonSlot = {
    // Stable per-slot identity ('slot-0' | 'slot-1' | 'slot-2'), independent
    // of scenarioId: the same scenario can occupy two slots with different
    // years, so scenarioId alone can't key data per slot.
    key: string;
    scenarioId: number;
    year: number;
    label: string;
    color: string;
    // True only for the fixed slot (the scenario the Planning page is
    // already showing) -- its scenario can't be changed, only its year.
    isCurrent: boolean;
};

export type DisplayMode = 'sideBySide' | 'overlay';
