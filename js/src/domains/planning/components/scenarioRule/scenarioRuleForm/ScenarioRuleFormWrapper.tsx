import React, {
    FC,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { useGetColors } from 'Iaso/hooks/useGetColors';
import { CardStyled } from '../../../../../components/CardStyled';
import { ExtendedFormikProvider } from '../../../../../hooks/useGetExtendedFormikContext';
import { MESSAGES } from '../../../../messages';
import { useCreateUpdateScenarioRule } from '../../../hooks/useCreateUpdateScenarioRule';
import {
    defaultScenarioRuleValues,
    ScenarioRuleFormValues,
    useScenarioRuleFormState,
} from '../../../hooks/useScenarioRuleFormState';
import { pickRandomPaletteColor } from '../../../libs/color-utils';
import { ScenarioRule } from '../../../types/scenarioRule';
import { ScenarioRuleForm } from './ScenarioRuleForm';
import { ScenarioRuleFormHeader } from './ScenarioRuleFormHeader';

const PREVIEW_DEBOUNCE_MS = 500;

type Props = {
    scenarioId: number;
    rule?: ScenarioRule;
    existingRules: ScenarioRule[];
    onClose: () => void;
    onChange?: (values: Partial<ScenarioRuleFormValues>) => void;
};

export const ScenarioRuleFormWrapper: FC<Props> = ({
    scenarioId,
    rule,
    existingRules,
    onClose,
    onChange,
}) => {
    const { formatMessage } = useSafeIntl();
    const { data: palette } = useGetColors();

    // useState's lazy initializer runs only on mount, so the random pick is
    // computed once and survives subsequent re-renders of the form. The
    // palette is prefetched by the parent so it's already cached here.
    const [initialColor] = useState(() =>
        pickRandomPaletteColor(
            palette ?? [],
            existingRules.map(r => r.color).filter(Boolean),
            defaultScenarioRuleValues.color,
        ),
    );

    const { mutate: createUpdateScenarioRule, isLoading: isSubmittingRule } =
        useCreateUpdateScenarioRule(scenarioId);

    const title = useMemo(() => {
        if (rule) {
            return formatMessage(MESSAGES.editScenarioRule);
        }
        return formatMessage(MESSAGES.createScenarioRule);
    }, [formatMessage, rule]);

    const initialValues: ScenarioRuleFormValues | undefined = useMemo(
        () =>
            rule
                ? {
                    id: rule.id,
                    scenario: rule.scenario,
                    name: rule.name,
                    color: rule.color,
                    is_match_all: rule.is_match_all ?? false,
                    intervention_properties: rule.intervention_properties,
                    matching_criteria: rule.matching_criteria,
                    org_units_excluded: rule.org_units_excluded,
                    org_units_included: rule.org_units_included,
                }
                : {
                    ...defaultScenarioRuleValues,
                    scenario: scenarioId,
                    color: initialColor,
                },
        [rule, scenarioId, initialColor],
    );

    const onSubmit = useCallback(
        (values: Partial<ScenarioRuleFormValues>) => {
            createUpdateScenarioRule(values, {
                onSuccess: () => {
                    onClose();
                },
            });
        },
        [createUpdateScenarioRule, onClose],
    );

    const formik = useScenarioRuleFormState({
        onSubmit,
        initialValues,
        editMode: Boolean(rule),
    });

    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const isFirstRender = useRef(true);
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const timer = setTimeout(() => {
            onChangeRef.current?.(formik.values);
        }, PREVIEW_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [formik.values]);

    return (
        <CardStyled
            header={
                <ScenarioRuleFormHeader
                    title={title}
                    onCancel={onClose}
                    onSubmit={formik.handleSubmit}
                    disabled={isSubmittingRule}
                />
            }
            isLoading={isSubmittingRule}
        >
            <ExtendedFormikProvider formik={formik}>
                <ScenarioRuleForm />
            </ExtendedFormikProvider>
        </CardStyled>
    );
};
