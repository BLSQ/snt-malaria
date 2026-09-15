import { useCallback, useMemo, useRef, useState } from 'react';
import { IntlMessage, useSafeIntl } from 'bluesquare-components';
import { isConcreteLegend, LegendTypes } from '../../../constants/legend';
import { useSaveCompositeLayer } from '../../compositeLayerEditor/hooks/useSaveCompositeLayer';
import { CompositeLayerListItem } from '../../compositeLayerEditor/types/compositeLayer';
import {
    initialTopColor,
    legendConfigFromForm,
    scaleFromDomainRange,
} from '../dataLayerForm/legendScale';
import { useCreateOrUpdateMetricType } from '../hooks/useCreateOrUpdateMetricType';
import { useDeleteMetricType } from '../hooks/useDeleteMetricType';
import { useGetMetricTypes } from '../hooks/useGetMetrics';
import { useImportMetricValuesJson } from '../hooks/useImportMetricValuesJson';
import { useImportOpenHexaDataLayer } from '../hooks/useImportOpenHexaDataLayer';
import {
    editFormModel,
    makeDefaultMetricType,
    useMetricTypeFormState,
} from '../hooks/useMetricTypeFormState';
import { MESSAGES } from '../messages';
import {
    MetricType,
    MetricTypeFormModel,
    ScaleDomainRange,
} from '../types/metrics';
import { WizardLayerType } from './constants';
import { parseYearlyCsv } from './gridCsv';
import {
    EDIT_STEPS,
    useDataLayerWizard,
    WIZARD_STEP_LABELS,
    WIZARD_STEPS,
} from './useDataLayerWizard';

/** Which component the page shows in the main column while the wizard is open. */
export type WizardMainView =
    | 'compositeGraph'
    | 'standardData'
    | 'legendPreview'
    | 'intro';

type ControllerArgs = {
    /** Called with the freshly created layer (when its object is available) so the
     *  page can select it on the map. */
    onCreated: (metricType?: MetricType) => void;
    categoryOptions: { label: string; value: string }[];
    /** Runs when the wizard closes, so the page can tear down composite-editor
     *  side panels it opened for the graph step. */
    onClosed?: () => void;
};

const layerTypeToFormFields = (
    layerType: WizardLayerType,
): Pick<MetricTypeFormModel, 'is_composite' | 'origin' | 'legend_type'> => ({
    is_composite: layerType === 'composite',
    origin: layerType === 'openhexa' ? 'openhexa' : 'custom',
    legend_type:
        layerType === 'composite' ? LegendTypes.AUTO : LegendTypes.THRESHOLD,
});

const layerTypeOf = (model: MetricTypeFormModel): WizardLayerType => {
    if (model.is_composite) return 'composite';
    if (model.origin === 'openhexa') return 'openhexa';
    return 'data';
};

/** Server validation code (e.g. `uniqueCode`) → the matching wizard message. */
const errorMessage = (code: string): IntlMessage =>
    (MESSAGES[`${code}Error` as keyof typeof MESSAGES] as IntlMessage) ??
    MESSAGES.genericError;

/** `/api/metrictypes/` payload shared by a standard layer's create and edit save
 *  (edit adds `id`). */
const metricTypePayload = (
    values: MetricTypeFormModel,
    legend_config: ScaleDomainRange | undefined,
) => ({
    name: values.name,
    code: values.code,
    description: values.description,
    source: values.source,
    units: values.units,
    unit_symbol: values.unit_symbol,
    comments: values.comments,
    category: values.category,
    origin: values.origin,
    legend_type: values.legend_type,
    legend_config,
    metric_kind: values.is_population ? 'population' : 'any',
});

/** `/api/snt_malaria/composite_layers/` payload shared by minting the draft shell
 *  and saving an edited composite's metadata + legend (edit adds `id`). */
const compositeLayerPayload = (
    values: MetricTypeFormModel,
    legend_config: ScaleDomainRange | undefined,
) => ({
    name: values.name,
    category: values.category,
    description: values.description,
    units: values.units,
    unit_symbol: values.unit_symbol,
    is_population: !!values.is_population,
    legend_type: values.legend_type,
    legend_config,
});

export const useDataLayerWizardController = ({
    onCreated,
    categoryOptions,
    onClosed,
}: ControllerArgs) => {
    const { formatMessage } = useSafeIntl();
    const [isOpen, setIsOpen] = useState(false);
    const [discardOpen, setDiscardOpen] = useState(false);
    /** Set when a create/save call fails; shown as an alert, cleared on retry / step change. */
    const [submitError, setSubmitError] = useState<IntlMessage>();
    /** The layer being edited (Details + Legend only); undefined for a create run. */
    const [editing, setEditing] = useState<{
        metricType: MetricType;
        compositeLayer?: CompositeLayerListItem;
    }>();

    const wizard = useDataLayerWizard();
    const { staged, patch, reset: resetStaged } = wizard;

    // Only needed once the wizard is open (unique codes + population-holder name).
    const { data: allMetricTypes } = useGetMetricTypes<MetricType>(
        true,
        isOpen,
    );
    const existingCodes = useMemo(
        () => new Set((allMetricTypes ?? []).map(mt => mt.code)),
        [allMetricTypes],
    );
    const populationHolderName = useMemo(
        () =>
            (allMetricTypes ?? []).find(mt => mt.metric_kind === 'population')
                ?.name,
        [allMetricTypes],
    );

    const { mutateAsync: createMetricType } = useCreateOrUpdateMetricType({
        onError: (code: string) => setSubmitError(errorMessage(code)),
        onSuccess: () => undefined,
    });
    const { mutateAsync: importGridValues } = useImportMetricValuesJson();
    const { mutateAsync: importOpenHexa } = useImportOpenHexaDataLayer();
    // Silent: the wizard mints a draft shell before the graph exists; the "Saved"
    // toast belongs to the graph save, not this one.
    const { mutateAsync: saveComposite } = useSaveCompositeLayer(true);
    // A user-driven composite metadata/legend edit — keep its "Saved" toast.
    const { mutateAsync: updateComposite } = useSaveCompositeLayer();
    const { mutate: deleteMetricType } = useDeleteMetricType();

    const formik = useMetricTypeFormState(undefined, () => undefined);

    // Wipe every trace of an in-progress creation: the formik model (values,
    // touched, errors, submit count) back to a fresh copy of the empty defaults,
    // and all staged wizard state (step, layer type, table, composite shell). Run
    // on open, on close, and on a confirmed discard.
    const resetAll = useCallback(() => {
        formik.resetForm({ values: makeDefaultMetricType() });
        resetStaged();
        setEditing(undefined);
        setSubmitError(undefined);
    }, [formik, resetStaged]);

    const open = useCallback(() => {
        resetAll();
        setIsOpen(true);
    }, [resetAll]);

    /** Edit an existing layer: pre-filled Details + Legend, no Type / Data steps. */
    const openForEdit = useCallback(
        (metricType: MetricType, compositeLayer?: CompositeLayerListItem) => {
            const model = editFormModel(metricType, compositeLayer);
            formik.resetForm({ values: model });
            wizard.start(EDIT_STEPS, { layerType: layerTypeOf(model) });
            setEditing({ metricType, compositeLayer });
            setSubmitError(undefined);
            setIsOpen(true);
        },
        [formik, wizard],
    );

    const close = useCallback(() => {
        setIsOpen(false);
        setDiscardOpen(false);
        resetAll();
        onClosed?.();
    }, [resetAll, onClosed]);

    const hasProgress = useMemo(
        () => formik.dirty || wizard.activeStepIndex > 0,
        [formik.dirty, wizard.activeStepIndex],
    );

    const requestClose = useCallback(() => {
        if (hasProgress) {
            setDiscardOpen(true);
            return;
        }
        close();
    }, [hasProgress, close]);

    // A composite shell's underlying MetricType id lives in the same
    // `createdMetricTypeId` field as a standard/OpenHexa layer's — one mechanism
    // for "a record was already created for this run and needs cleaning up".
    const confirmDiscard = useCallback(() => {
        if (staged.createdMetricTypeId) {
            deleteMetricType(staged.createdMetricTypeId);
        }
        close();
    }, [staged.createdMetricTypeId, deleteMetricType, close]);

    const cancelDiscard = useCallback(() => setDiscardOpen(false), []);

    const setLayerType = useCallback(
        (layerType: WizardLayerType) => {
            // A record already created for a different type no longer belongs to
            // this run: delete it so it doesn't linger on the server
            // (wizard.setLayerType clears the id).
            if (layerType !== staged.layerType && staged.createdMetricTypeId) {
                deleteMetricType(staged.createdMetricTypeId);
            }
            wizard.setLayerType(layerType);
            Object.entries(layerTypeToFormFields(layerType)).forEach(
                ([field, value]) => formik.setFieldValue(field, value),
            );
            if (layerType === 'composite' && !formik.values.category) {
                formik.setFieldValue('category', 'Composite');
            }
        },
        [
            wizard,
            formik,
            staged.layerType,
            staged.createdMetricTypeId,
            deleteMetricType,
        ],
    );

    // Recomputed every render: formik keeps a stable object identity while its
    // `errors`/`values` mutate, so memoising on `formik` would go stale (e.g. the
    // OpenHexa source auto-fill clearing the Details errors).
    const { errors: formikErrors, values: formikValues } = formik;
    let canAdvance: boolean;
    switch (wizard.activeStep) {
        case WIZARD_STEPS.DETAILS:
            canAdvance =
                !formikErrors.name &&
                !formikErrors.category &&
                (formikValues.is_composite || !formikErrors.code) &&
                Boolean(formikValues.name) &&
                Boolean(formikValues.category);
            break;
        case WIZARD_STEPS.LEGEND:
            canAdvance = formik.isValid;
            break;
        default:
            // Type and Data steps have no blocking client-side validation.
            canAdvance = true;
    }

    const goBack = wizard.goBack;

    const [isSubmitting, setIsSubmitting] = useState(false);
    // Guards the composite-shell save against a double-click while it's in flight
    // (the button's `isSubmitting` disable is a render behind an async click).
    const busyRef = useRef(false);

    const legendPayload = useCallback(() => {
        const { legend_type, legend_config, legend_top_color } = formik.values;
        return isConcreteLegend(legend_type)
            ? (legendConfigFromForm(
                  legend_type,
                  legend_config,
                  legend_top_color,
              ) as ScaleDomainRange)
            : undefined;
    }, [formik.values]);

    /** Sends the table (every non-blank cell) as JSON, replacing whatever the
     *  server has for the years the table currently covers — used when leaving the
     *  Data step, so a bad value surfaces its error there instead of silently
     *  reaching Legend with no values. No-op if there are no year columns at all
     *  (shouldn't normally happen — the table always starts with one). */
    const submitGridValues = useCallback(
        async (metricTypeId: number) => {
            if (staged.gridYears.length === 0) return;
            const values: {
                org_unit_id: number;
                year: number;
                value: string;
            }[] = [];
            Object.entries(staged.gridValues).forEach(([orgUnitId, byYear]) => {
                Object.entries(byYear).forEach(([year, value]) => {
                    if (value.trim() !== '') {
                        values.push({
                            org_unit_id: Number(orgUnitId),
                            year: Number(year),
                            value: value.trim(),
                        });
                    }
                });
            });
            await importGridValues({
                metric_type_id: metricTypeId,
                years: staged.gridYears,
                values,
            });
        },
        [staged.gridYears, staged.gridValues, importGridValues],
    );

    /** Parses a picked CSV and merges it into the table right away — nothing is
     *  sent to the backend here, so the user can fine-tune it before it's saved. */
    const onCsvFileSelected = useCallback(
        async (file: File) => {
            const text = await file.text();
            const { years, valuesByOrgUnit } = parseYearlyCsv(text);
            wizard.mergeGridFromCsv(years, valuesByOrgUnit);
        },
        [wizard],
    );

    const goNext = useCallback(async () => {
        // Steps aren't always a contiguous run of `WIZARD_STEPS` (an edit skips
        // Data), so the actual next step is a lookup, not `activeStep + 1`.
        const nextStep = wizard.steps[wizard.activeStepIndex + 1];
        const leavingDetails = nextStep === WIZARD_STEPS.DATA;
        const leavingData =
            wizard.activeStep === WIZARD_STEPS.DATA &&
            nextStep === WIZARD_STEPS.LEGEND;
        const needsCompositeShell =
            leavingDetails &&
            staged.layerType === 'composite' &&
            !staged.compositeLayerId;
        const needsOpenHexaImport =
            leavingDetails &&
            staged.layerType === 'openhexa' &&
            !staged.createdMetricTypeId;
        const needsStandardCreate =
            leavingDetails &&
            staged.layerType === 'data' &&
            !staged.createdMetricTypeId;
        const createdMetricTypeId = staged.createdMetricTypeId;
        const needsStandardImport =
            leavingData &&
            staged.layerType === 'data' &&
            staged.gridYears.length > 0 &&
            Boolean(createdMetricTypeId);
        if (
            !needsCompositeShell &&
            !needsOpenHexaImport &&
            !needsStandardCreate &&
            !needsStandardImport
        ) {
            wizard.goNext();
            return;
        }
        if (busyRef.current) return;
        busyRef.current = true;
        setIsSubmitting(true);
        setSubmitError(undefined);
        try {
            if (needsCompositeShell) {
                // Persist the shell so the node editor (keyed by a real id) can run.
                // The legend step comes after the graph now, so it isn't known yet —
                // the shell's legend is filled in later, at final submit.
                const saved = await saveComposite(
                    compositeLayerPayload(formik.values, legendPayload()),
                );
                patch({
                    compositeLayerId: saved.id,
                    createdMetricTypeId: saved.metric_type ?? undefined,
                });
            } else if (needsOpenHexaImport) {
                const { metric_type_id: metricTypeId } = await importOpenHexa({
                    code: formik.values.code,
                    legend_config: legendPayload(),
                });
                patch({ createdMetricTypeId: metricTypeId });
            } else if (needsStandardCreate) {
                const created = (await createMetricType(
                    metricTypePayload(formik.values, legendPayload()) as any,
                )) as MetricType;
                patch({ createdMetricTypeId: created.id });
            } else if (needsStandardImport && createdMetricTypeId) {
                await submitGridValues(createdMetricTypeId);
            }
            wizard.goNext();
        } catch {
            // createMetricType's onError already resolved a specific message for
            // needsStandardCreate (e.g. a duplicate code); fall back to a generic
            // one for the other, snackbar-only failure paths.
            setSubmitError(prev => prev ?? MESSAGES.genericError);
        } finally {
            busyRef.current = false;
            setIsSubmitting(false);
        }
    }, [
        wizard,
        staged.layerType,
        staged.compositeLayerId,
        staged.createdMetricTypeId,
        staged.gridYears,
        saveComposite,
        importOpenHexa,
        createMetricType,
        submitGridValues,
        formik.values,
        legendPayload,
        patch,
    ]);

    const submitStandard = useCallback(async () => {
        const updated = (await createMetricType({
            id: staged.createdMetricTypeId,
            ...metricTypePayload(formik.values, legendPayload()),
        } as any)) as MetricType;
        onCreated(updated);
        close();
    }, [
        staged.createdMetricTypeId,
        formik.values,
        legendPayload,
        createMetricType,
        onCreated,
        close,
    ]);

    const submitEdit = useCallback(async () => {
        const values = formik.values;
        const legend_config = legendPayload();
        if (editing?.compositeLayer) {
            const saved = await updateComposite({
                id: editing.compositeLayer.id,
                ...compositeLayerPayload(values, legend_config),
            });
            onCreated(saved.metric_type_detail ?? undefined);
        } else {
            const updated = (await createMetricType({
                id: editing?.metricType.id,
                ...metricTypePayload(values, legend_config),
            } as any)) as MetricType;
            onCreated(updated);
        }
        close();
    }, [
        editing,
        formik.values,
        legendPayload,
        updateComposite,
        createMetricType,
        onCreated,
        close,
    ]);

    /** Finalise a newly-created composite: the shell was minted before its graph
     *  step (with no legend yet) and the graph itself is already saved, so this
     *  just fills in the metadata + legend now that both are known. */
    const submitCompositeCreate = useCallback(async () => {
        const saved = await updateComposite({
            id: staged.compositeLayerId,
            ...compositeLayerPayload(formik.values, legendPayload()),
        });
        onCreated(saved.metric_type_detail ?? undefined);
        close();
    }, [
        staged.compositeLayerId,
        formik.values,
        legendPayload,
        updateComposite,
        onCreated,
        close,
    ]);

    const submit = useCallback(async () => {
        setSubmitError(undefined);
        setIsSubmitting(true);
        try {
            if (editing) {
                await submitEdit();
            } else if (staged.layerType === 'composite') {
                await submitCompositeCreate();
            } else {
                // Standard and OpenHexa are both already created by `goNext`; this
                // just finalises their legend.
                await submitStandard();
            }
        } catch {
            // createMetricType's onError already resolved a specific message;
            // fall back to a generic one for the composite path.
            setSubmitError(prev => prev ?? MESSAGES.genericError);
        } finally {
            setIsSubmitting(false);
        }
    }, [
        editing,
        submitEdit,
        staged.layerType,
        submitCompositeCreate,
        submitStandard,
    ]);

    /** The composite node editor persisted the graph and, since it ran, the backend
     *  resolved a concrete legend from it (an "auto"/"reference" request becomes a
     *  real threshold/linear/ordinal one) — seed the Legend step's fields with it so
     *  it starts from what the graph actually produced instead of generic defaults,
     *  same as an OpenHexa pick autofills Details. Then move on to Legend instead of
     *  finishing; `submitCompositeCreate` does that once the user confirms it. */
    const onCompositeGraphSaved = useCallback(
        (metricType?: MetricType) => {
            if (metricType) {
                // A single `setValues` call so Formik validates the fully merged legend
                // fields once — three separate `setFieldValue` calls each validate
                // against a stale snapshot missing the other two, which can leave
                // `isValid` (and the Submit button) stuck on a spurious error.
                formik.setValues({
                    ...formik.values,
                    legend_type: metricType.legend_type,
                    legend_config: scaleFromDomainRange(
                        metricType.legend_config,
                    ),
                    legend_top_color: initialTopColor(metricType.legend_config),
                });
            }
            goNext();
        },
        [formik, goNext],
    );

    const clearSubmitError = useCallback(() => setSubmitError(undefined), []);

    const stepLabels = useMemo(
        () =>
            wizard.steps.map(step =>
                formatMessage(
                    step === WIZARD_STEPS.DATA &&
                        staged.layerType === 'composite'
                        ? MESSAGES.wizardStepGraph
                        : WIZARD_STEP_LABELS[step],
                ),
            ),
        [formatMessage, wizard.steps, staged.layerType],
    );

    const resolveMainView = (): WizardMainView => {
        if (wizard.isCompositeGraphStep) return 'compositeGraph';
        if (wizard.activeStep === WIZARD_STEPS.DATA) return 'standardData';
        if (wizard.activeStep === WIZARD_STEPS.LEGEND) return 'legendPreview';
        return 'intro'; // Type / Details
    };
    const wizardMainView = resolveMainView();

    const isEditing = Boolean(editing);
    // Resolved once here (the only place that knows both `isEditing` and the
    // layer type) so the panel and the discard modal don't each re-derive it.
    const titleMessage = isEditing ? MESSAGES.editLayer : MESSAGES.wizardTitle;
    const discardMessage =
        (isEditing && MESSAGES.wizardDiscardEditConfirm) ||
        (staged.layerType === 'composite' &&
            MESSAGES.wizardDiscardGraphConfirm) ||
        (staged.createdMetricTypeId && MESSAGES.wizardDiscardCreatedConfirm) ||
        MESSAGES.wizardDiscardLayerConfirm;

    return {
        isOpen,
        open,
        openForEdit,
        close,
        requestClose,
        discardOpen,
        confirmDiscard,
        cancelDiscard,
        formik,
        stepLabels,
        titleMessage,
        discardMessage,
        activeStep: wizard.activeStep,
        activeStepIndex: wizard.activeStepIndex,
        lastStep: wizard.lastStep,
        goNext,
        goBack,
        canAdvance,
        isEditing,
        editingMetricType: editing?.metricType,
        layerType: staged.layerType,
        setLayerType,
        staged,
        onCsvFileSelected,
        setGridValue: wizard.setGridValue,
        addGridYear: wizard.addGridYear,
        removeGridYear: wizard.removeGridYear,
        isCompositeGraphStep: wizard.isCompositeGraphStep,
        /** Which component the main column shows while the wizard is open; the page
         *  falls back to the map when it is closed. */
        wizardMainView,
        compositeLayerId: staged.compositeLayerId,
        onCompositeGraphSaved,
        submit,
        isSubmitting,
        submitError,
        clearSubmitError,
        existingCodes,
        populationHolderName,
        categoryOptions,
    };
};

export type DataLayerWizardController = ReturnType<
    typeof useDataLayerWizardController
>;
