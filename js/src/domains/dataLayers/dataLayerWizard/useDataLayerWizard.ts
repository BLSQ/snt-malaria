import { useCallback, useMemo, useState } from 'react';
import { currentYear } from '../../../constants/shared';
import { MESSAGES } from '../messages';
import { WizardLayerType } from './constants';

export const WIZARD_STEPS = {
    TYPE: 0,
    DETAILS: 1,
    // Data / graph comes before Legend: the values (or composite graph) need to
    // exist for the Legend step's map preview to show anything real.
    DATA: 2,
    LEGEND: 3,
} as const;

export type WizardStep = (typeof WIZARD_STEPS)[keyof typeof WIZARD_STEPS];

const sortedUniqueYears = (years: number[]): number[] =>
    Array.from(new Set(years)).sort((a, b) => a - b);

const mergeYearValues = (
    base: Record<number, string> | undefined,
    updates: Record<number, string>,
): Record<number, string> => ({ ...base, ...updates });

/** A standard layer's table always starts with a single column for the current year. */
const DEFAULT_GRID_YEARS = [currentYear];

/** Editing an existing layer runs Details then Legend only — its type is fixed and
 *  its values are managed elsewhere — which skips Data, so the two runs aren't a
 *  contiguous span of `WIZARD_STEPS` and each is listed explicitly. */
export const CREATE_STEPS: WizardStep[] = [
    WIZARD_STEPS.TYPE,
    WIZARD_STEPS.DETAILS,
    WIZARD_STEPS.DATA,
    WIZARD_STEPS.LEGEND,
];
export const EDIT_STEPS: WizardStep[] = [
    WIZARD_STEPS.DETAILS,
    WIZARD_STEPS.LEGEND,
];

/** Step titles, index-aligned with `WIZARD_STEPS`. The Data one is overridden to
 *  "Graph" for a composite layer (see `stepLabels` in the controller). */
export const WIZARD_STEP_LABELS = [
    MESSAGES.wizardStepType,
    MESSAGES.wizardStepDetails,
    MESSAGES.wizardStepData,
    MESSAGES.wizardStepLegend,
];

type StagedState = {
    layerType: WizardLayerType;
    /** Table values for a standard layer: org unit id -> year -> raw text; blank or
     *  absent means no value. */
    gridValues: Record<number, Record<number, string>>;
    /** Year columns currently shown in the table, in display order. */
    gridYears: number[];
    importedYears?: number[];
    /** Persisted composite shell id, once the graph step creates it (2a keeps the
     *  editor in-flow). */
    compositeLayerId?: number;
    createdMetricTypeId?: number;
    /** Code of the OpenHexa source `createdMetricTypeId` was last imported from, so a
     *  re-pick on Details can tell whether the Data step needs to cancel + redo it. */
    importedCode?: string;
};

const INITIAL: StagedState = {
    layerType: 'data',
    gridValues: {},
    gridYears: DEFAULT_GRID_YEARS,
};

export const useDataLayerWizard = () => {
    const [steps, setSteps] = useState<WizardStep[]>(CREATE_STEPS);
    const [activeStep, setActiveStep] = useState<WizardStep>(CREATE_STEPS[0]);
    const [staged, setStaged] = useState<StagedState>(INITIAL);

    const patch = useCallback(
        (next: Partial<StagedState>) =>
            setStaged(prev => ({ ...prev, ...next })),
        [],
    );

    /** Start a fresh run over the given steps (create or edit), at the first one,
     *  with every staged field cleared (`initialStaged` seeds it, e.g. with the
     *  layer type an edit run already knows). */
    const start = useCallback(
        (nextSteps: WizardStep[], initialStaged?: Partial<StagedState>) => {
            setSteps(nextSteps);
            setActiveStep(nextSteps[0]);
            setStaged({ ...INITIAL, ...initialStaged });
        },
        [],
    );

    const reset = useCallback(() => start(CREATE_STEPS), [start]);

    const setLayerType = useCallback((layerType: WizardLayerType) => {
        setStaged(prev => ({
            ...prev,
            layerType,
            // Table entries only apply to a standard layer; drop them otherwise.
            ...(layerType === 'data'
                ? {}
                : {
                      gridValues: {},
                      gridYears: DEFAULT_GRID_YEARS,
                      importedYears: undefined,
                  }),
            // A composite shell no longer belongs to a layer of a different type;
            // the controller deletes the persisted record first.
            ...(layerType === 'composite'
                ? {}
                : { compositeLayerId: undefined }),
            // Same for a standard/OpenHexa MetricType already created for a
            // previous pick — reselecting the same type keeps it.
            ...(layerType === prev.layerType
                ? {}
                : { createdMetricTypeId: undefined, importedCode: undefined }),
        }));
    }, []);

    const setGridValue = useCallback(
        (orgUnitId: number, year: number, value: string) =>
            setStaged(prev => ({
                ...prev,
                gridValues: {
                    ...prev.gridValues,
                    [orgUnitId]: mergeYearValues(prev.gridValues[orgUnitId], {
                        [year]: value,
                    }),
                },
            })),
        [],
    );

    const addGridYear = useCallback(
        (year: number) =>
            setStaged(prev =>
                prev.gridYears.includes(year)
                    ? prev
                    : {
                          ...prev,
                          gridYears: sortedUniqueYears([
                              ...prev.gridYears,
                              year,
                          ]),
                      },
            ),
        [],
    );

    const removeGridYear = useCallback(
        (year: number) =>
            setStaged(prev => ({
                ...prev,
                gridYears: prev.gridYears.filter(y => y !== year),
                gridValues: Object.fromEntries(
                    Object.entries(prev.gridValues).map(
                        ([orgUnitId, byYear]) => {
                            const { [year]: _removed, ...rest } = byYear;
                            return [orgUnitId, rest];
                        },
                    ),
                ),
            })),
        [],
    );

    /** Merges CSV-parsed values into the table (adding any new year columns), so
     *  uploading a file fills the table without discarding what's already there. */
    const mergeGridFromCsv = useCallback(
        (
            years: number[],
            valuesByOrgUnit: Record<number, Record<number, string>>,
        ) =>
            setStaged(prev => {
                const gridYears = sortedUniqueYears([
                    ...prev.gridYears,
                    ...years,
                ]);
                const gridValues = { ...prev.gridValues };
                Object.entries(valuesByOrgUnit).forEach(
                    ([orgUnitId, byYear]) => {
                        gridValues[Number(orgUnitId)] = mergeYearValues(
                            gridValues[Number(orgUnitId)],
                            byYear,
                        );
                    },
                );
                return { ...prev, gridYears, gridValues };
            }),
        [],
    );

    const goNext = useCallback(
        () =>
            setActiveStep(step => {
                const index = steps.indexOf(step);
                return steps[Math.min(index + 1, steps.length - 1)];
            }),
        [steps],
    );
    const goBack = useCallback(
        () =>
            setActiveStep(step => {
                const index = steps.indexOf(step);
                return steps[Math.max(index - 1, 0)];
            }),
        [steps],
    );

    const activeStepIndex = steps.indexOf(activeStep);
    const lastStep = steps[steps.length - 1];

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
        addGridYear,
        removeGridYear,
        mergeGridFromCsv,
        isCompositeGraphStep,
    };
};
