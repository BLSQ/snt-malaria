import { useCallback, useMemo, useRef, useState } from 'react';
import { IntlMessage, useSafeIntl } from 'bluesquare-components';
import { isConcreteLegend, LegendTypes } from '../../../constants/legend';
import { useSaveCompositeLayer } from '../../compositeLayerEditor/hooks/useSaveCompositeLayer';
import { CompositeLayerListItem } from '../../compositeLayerEditor/types/compositeLayer';
import { legendConfigFromForm } from '../dataLayerForm/legendScale';
import { useCreateOrUpdateMetricType } from '../hooks/useCreateOrUpdateMetricType';
import { useDeleteMetricType } from '../hooks/useDeleteMetricType';
import { useGetMetricTypes } from '../hooks/useGetMetrics';
import { useImportMetricValues } from '../hooks/useImportMetricValues';
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
import { gridCsvFile } from './csvFromGrid';
import {
    EDIT_RANGE,
    useDataLayerWizard,
    WIZARD_STEP_LABELS,
    WIZARD_STEPS,
    WizardStep,
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
    /** MetricType id of a composite shell created for step 3, kept so it can be
     *  cleaned up if the wizard is abandoned before it is finished. */
    const [pendingCompositeMetricTypeId, setPendingCompositeMetricTypeId] =
        useState<number>();

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
    const { mutateAsync: importValues } = useImportMetricValues();
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
    // and all staged wizard state (step, layer type, CSV file, grid, year,
    // composite shell). Run on open, on close, and on a confirmed discard.
    const resetAll = useCallback(() => {
        formik.resetForm({ values: makeDefaultMetricType() });
        resetStaged();
        setEditing(undefined);
        setSubmitError(undefined);
        setPendingCompositeMetricTypeId(undefined);
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
            wizard.start(EDIT_RANGE, { layerType: layerTypeOf(model) });
            setEditing({ metricType, compositeLayer });
            setSubmitError(undefined);
            setPendingCompositeMetricTypeId(undefined);
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

    const confirmDiscard = useCallback(() => {
        if (pendingCompositeMetricTypeId) {
            deleteMetricType(pendingCompositeMetricTypeId);
        }
        close();
    }, [pendingCompositeMetricTypeId, deleteMetricType, close]);

    const cancelDiscard = useCallback(() => setDiscardOpen(false), []);

    const setLayerType = useCallback(
        (layerType: WizardLayerType) => {
            // Leaving 'composite' after a draft shell was minted: delete it so it
            // doesn't linger on the server (wizard.setLayerType clears the id).
            if (layerType !== 'composite' && pendingCompositeMetricTypeId) {
                deleteMetricType(pendingCompositeMetricTypeId);
                setPendingCompositeMetricTypeId(undefined);
            }
            wizard.setLayerType(layerType);
            Object.entries(layerTypeToFormFields(layerType)).forEach(
                ([field, value]) => formik.setFieldValue(field, value),
            );
            if (layerType === 'composite' && !formik.values.category) {
                formik.setFieldValue('category', 'Composite');
            }
        },
        [wizard, formik, pendingCompositeMetricTypeId, deleteMetricType],
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

    const goNext = useCallback(async () => {
        const nextStep = (wizard.activeStep + 1) as WizardStep;
        const needsShell =
            nextStep === WIZARD_STEPS.DATA &&
            staged.layerType === 'composite' &&
            !staged.compositeLayerId;
        if (!needsShell) {
            wizard.goNext();
            return;
        }
        if (busyRef.current) return;
        busyRef.current = true;
        setIsSubmitting(true);
        try {
            // Persist the shell so the node editor (keyed by a real id) can run.
            // The legend step is already done, so it goes in now.
            const saved = await saveComposite(
                compositeLayerPayload(formik.values, legendPayload()),
            );
            patch({ compositeLayerId: saved.id });
            setPendingCompositeMetricTypeId(saved.metric_type ?? undefined);
            wizard.goNext();
        } catch {
            setSubmitError(MESSAGES.genericError);
        } finally {
            busyRef.current = false;
            setIsSubmitting(false);
        }
    }, [wizard, staged, saveComposite, formik.values, legendPayload, patch]);

    const submitStandard = useCallback(async () => {
        const values = formik.values;
        // Create the type first (the CSV import needs its `code` column).
        const created = (await createMetricType(
            metricTypePayload(values, legendPayload()) as any,
        )) as MetricType;

        // The layer now exists; a failing value import shouldn't trap the user in
        // the wizard — `useImportMetricValues` already snackbars the error, and the
        // values can be imported later from the layer's Data menu.
        try {
            if (staged.method === 'manual') {
                const rows = Object.entries(staged.gridValues).map(
                    ([orgUnitId, value]) => ({
                        orgUnitId: Number(orgUnitId),
                        adm1Name: '',
                        adm2Name: '',
                        value,
                    }),
                );
                if (rows.some(row => row.value.trim() !== '')) {
                    await importValues({
                        file: gridCsvFile(rows, values.code),
                        year: staged.csvYear,
                    });
                }
            } else if (staged.csvFile) {
                await importValues({
                    file: staged.csvFile,
                    year: staged.csvYear,
                });
            }
        } catch {
            // swallowed on purpose — see comment above
        }
        onCreated(created);
        close();
    }, [
        formik.values,
        staged,
        legendPayload,
        createMetricType,
        importValues,
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

    const submitOpenHexaCreate = useCallback(async () => {
        await importOpenHexa({
            code: formik.values.code,
            legend_config: legendPayload(),
        });
        onCreated(undefined);
        close();
    }, [formik.values.code, legendPayload, importOpenHexa, onCreated, close]);

    const submit = useCallback(async () => {
        setSubmitError(undefined);
        setIsSubmitting(true);
        try {
            if (editing) {
                await submitEdit();
            } else if (staged.layerType === 'openhexa') {
                await submitOpenHexaCreate();
            } else {
                await submitStandard();
            }
        } catch {
            // createMetricType's onError already resolved a specific message;
            // fall back to a generic one for the openhexa / composite path.
            setSubmitError(prev => prev ?? MESSAGES.genericError);
        } finally {
            setIsSubmitting(false);
        }
    }, [
        editing,
        submitEdit,
        staged.layerType,
        submitOpenHexaCreate,
        submitStandard,
    ]);

    /** The composite node editor persisted the graph (the last step); the shell
     *  already carries the metadata + legend, so just finalise. */
    const onCompositeGraphSaved = useCallback(
        (metricType?: MetricType) => {
            setPendingCompositeMetricTypeId(undefined);
            onCreated(metricType);
            close();
        },
        [onCreated, close],
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
        patch,
        setGridValue: wizard.setGridValue,
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
