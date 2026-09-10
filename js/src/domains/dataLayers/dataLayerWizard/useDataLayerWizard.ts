import { useCallback, useMemo, useState } from 'react';
import { currentYear } from '../../../constants/shared';
import { MESSAGES } from '../messages';
import { StandardValueMethod, WizardLayerType } from './constants';

export const WIZARD_STEPS = {
    TYPE: 0,
    DETAILS: 1,
    LEGEND: 2,
    // Data / graph is the last step: the values (or composite graph) are entered
    // against the legend configured just before.
    DATA: 3,
} as const;

export type WizardStep = (typeof WIZARD_STEPS)[keyof typeof WIZARD_STEPS];

/** A contiguous span of `WIZARD_STEPS` to run. Editing an existing layer runs a
 *  subset (Details + Legend) — its type is fixed and its values are managed
 *  elsewhere — while creating one runs the full span. */
export type WizardStepRange = { first: WizardStep; last: WizardStep };

export const CREATE_RANGE: WizardStepRange = {
    first: WIZARD_STEPS.TYPE,
    last: WIZARD_STEPS.DATA,
};
export const EDIT_RANGE: WizardStepRange = {
    first: WIZARD_STEPS.DETAILS,
    last: WIZARD_STEPS.LEGEND,
};

const stepsInRange = ({ first, last }: WizardStepRange): WizardStep[] => {
    const steps: WizardStep[] = [];
    for (let step = first; step <= last; step += 1) {
        steps.push(step as WizardStep);
    }
    return steps;
};

/** Step titles, index-aligned with `WIZARD_STEPS`. The last one is overridden to
 *  "Graph" for a composite layer (see `stepLabels` in the controller). */
export const WIZARD_STEP_LABELS = [
    MESSAGES.wizardStepType,
    MESSAGES.wizardStepDetails,
    MESSAGES.wizardStepLegend,
    MESSAGES.wizardStepData,
];

type StagedState = {
    layerType: WizardLayerType;
    method: StandardValueMethod;
    csvFile: File | null;
    csvYear: number;
    /** Manual grid entries, keyed by org unit id; blank/absent means no value. */
    gridValues: Record<number, string>;
    /** Persisted composite shell id, once the graph step creates it (2a keeps the
     *  editor in-flow). */
    compositeLayerId?: number;
};

const INITIAL: StagedState = {
    layerType: 'data',
    method: 'csv',
    csvFile: null,
    csvYear: currentYear,
    gridValues: {},
};

export const useDataLayerWizard = () => {
    const [range, setRange] = useState<WizardStepRange>(CREATE_RANGE);
    const [activeStep, setActiveStep] = useState<WizardStep>(
        CREATE_RANGE.first,
    );
    const [staged, setStaged] = useState<StagedState>(INITIAL);

    const patch = useCallback(
        (next: Partial<StagedState>) =>
            setStaged(prev => ({ ...prev, ...next })),
        [],
    );

    /** Start a fresh run over the given step range (create or edit), at its first
     *  step, with every staged field cleared (`initialStaged` seeds it, e.g. with
     *  the layer type an edit run already knows). */
    const start = useCallback(
        (nextRange: WizardStepRange, initialStaged?: Partial<StagedState>) => {
            setRange(nextRange);
            setActiveStep(nextRange.first);
            setStaged({ ...INITIAL, ...initialStaged });
        },
        [],
    );

    const reset = useCallback(() => start(CREATE_RANGE), [start]);

    const setLayerType = useCallback((layerType: WizardLayerType) => {
        setStaged(prev => ({
            ...prev,
            layerType,
            // Value-entry choices only apply to a standard layer; drop them otherwise.
            ...(layerType === 'data'
                ? {}
                : { method: 'csv', csvFile: null, gridValues: {} }),
            // A composite shell no longer belongs to a non-composite layer; the
            // controller deletes the persisted record before this runs.
            ...(layerType === 'composite'
                ? {}
                : { compositeLayerId: undefined }),
        }));
    }, []);

    const setGridValue = useCallback(
        (orgUnitId: number, value: string) =>
            setStaged(prev => ({
                ...prev,
                gridValues: { ...prev.gridValues, [orgUnitId]: value },
            })),
        [],
    );

    const goNext = useCallback(
        () =>
            setActiveStep(step => Math.min(step + 1, range.last) as WizardStep),
        [range.last],
    );
    const goBack = useCallback(
        () =>
            setActiveStep(
                step => Math.max(step - 1, range.first) as WizardStep,
            ),
        [range.first],
    );

    const steps = useMemo(() => stepsInRange(range), [range]);
    const activeStepIndex = activeStep - range.first;
    const lastStep = range.last;

    const isCompositeGraphStep = useMemo(
        () =>
            activeStep === WIZARD_STEPS.DATA &&
            staged.layerType === 'composite',
        [activeStep, staged.layerType],
    );

    return {
        steps,
        activeStep,
        activeStepIndex,
        lastStep,
        setActiveStep,
        goNext,
        goBack,
        staged,
        patch,
        start,
        reset,
        setLayerType,
        setGridValue,
        isCompositeGraphStep,
    };
};
