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

export const LAST_WIZARD_STEP: WizardStep = WIZARD_STEPS.DATA;

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
    const [activeStep, setActiveStep] = useState<WizardStep>(WIZARD_STEPS.TYPE);
    const [staged, setStaged] = useState<StagedState>(INITIAL);

    const patch = useCallback(
        (next: Partial<StagedState>) =>
            setStaged(prev => ({ ...prev, ...next })),
        [],
    );

    /** Back to a pristine wizard: first step, every staged field cleared. */
    const reset = useCallback(() => {
        setActiveStep(WIZARD_STEPS.TYPE);
        setStaged({ ...INITIAL });
    }, []);

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
            setActiveStep(
                step => Math.min(step + 1, LAST_WIZARD_STEP) as WizardStep,
            ),
        [],
    );
    const goBack = useCallback(
        () =>
            setActiveStep(
                step => Math.max(step - 1, WIZARD_STEPS.TYPE) as WizardStep,
            ),
        [],
    );

    const isCompositeGraphStep = useMemo(
        () =>
            activeStep === WIZARD_STEPS.DATA &&
            staged.layerType === 'composite',
        [activeStep, staged.layerType],
    );

    return {
        activeStep,
        setActiveStep,
        goNext,
        goBack,
        staged,
        patch,
        reset,
        setLayerType,
        setGridValue,
        isCompositeGraphStep,
    };
};
