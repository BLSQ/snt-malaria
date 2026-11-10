import React, {
    ChangeEvent,
    FC,
    ReactNode,
    useCallback,
    useMemo,
    useState,
} from 'react';
import {
    Alert,
    FormControl,
    FormControlLabel,
    FormLabel,
    Radio,
    RadioGroup,
    Stack,
    Typography,
} from '@mui/material';
import {
    ConfirmCancelModal,
    IntlMessage,
    useSafeIntl,
} from 'bluesquare-components';
import { numericValues } from 'Iaso/domains/instances/utils/intl';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../messages';
import { useDeleteIntervention } from '../../hooks/useDeleteIntervention';
import { Intervention, InterventionUsageScenario } from '../../types';
import { ConfirmNameField } from './ConfirmNameField';
import { InterventionUsageList } from './InterventionUsageList';
import { ReplacementField } from './ReplacementField';
import { useReplacementOptions } from './useReplacementOptions';

type RulesAction = 'replace' | 'remove';

type Props = {
    intervention: Intervention;
    usage: InterventionUsageScenario[];
    onClose: () => void;
    onDeleted: () => void;
};

const styles = {
    legend: {
        mb: 1.5,
        typography: 'body2',
        fontWeight: 'medium',
        color: 'text.primary',
        '&.Mui-focused': {
            color: 'text.primary',
        },
        '&.Mui-disabled': {
            color: 'text.disabled',
        },
    },
    radioGroup: {
        gap: 2,
    },
    optionLabel: {
        alignItems: 'flex-start',
        mx: 0,
        gap: 1.5,
        '& .MuiFormControlLabel-label': {
            flex: 1,
        },
    },
    optionRadio: {
        p: 0,
    },
    optionTitle: {
        fontWeight: 'medium',
    },
} satisfies SxStyles;

type RulesActionOptionProps = {
    value: RulesAction;
    title: string;
    children: ReactNode;
};

const RulesActionOption: FC<RulesActionOptionProps> = ({
    value,
    title,
    children,
}) => (
    <FormControlLabel
        value={value}
        control={<Radio sx={styles.optionRadio} />}
        sx={styles.optionLabel}
        label={
            <Stack spacing={1}>
                <Typography variant="body2" sx={styles.optionTitle}>
                    {title}
                </Typography>
                {children}
            </Stack>
        }
    />
);

export const DeleteInterventionDialog: FC<Props> = ({
    intervention,
    usage,
    onClose,
    onDeleted,
}) => {
    const { formatMessage } = useSafeIntl();
    const { mutate: deleteIntervention, isLoading: isDeleting } =
        useDeleteIntervention();
    const replacementOptions = useReplacementOptions(intervention);

    const [rulesAction, setRulesAction] = useState<RulesAction | null>(null);
    const [replacementId, setReplacementId] = useState<number>();
    const [confirmName, setConfirmName] = useState('');

    const isUsed = usage.length > 0;
    const lockedCount = usage.filter(({ is_locked }) => is_locked).length;
    const isReplacing = rulesAction === 'replace';
    const isRemoving = rulesAction === 'remove';
    const replacement = replacementOptions.find(
        ({ value }) => value === replacementId,
    );
    const ruleCount = useMemo(
        () =>
            usage.reduce((count, scenario) => count + scenario.rules.length, 0),
        [usage],
    );
    const countValues = {
        name: intervention.name,
        ...numericValues({
            ruleCount,
            scenarioCount: usage.length,
            lockedCount,
        }),
    };

    const canConfirm =
        !isDeleting &&
        (!isUsed ||
            (confirmName.trim() === intervention.name &&
                (isRemoving || Boolean(isReplacing && replacement))));

    const handleRulesActionChange = useCallback(
        (_event: ChangeEvent<HTMLInputElement>, value: string) =>
            setRulesAction(value as RulesAction),
        [],
    );

    const handleConfirm = useCallback(() => {
        deleteIntervention(
            {
                interventionId: intervention.id,
                replaceWith: isReplacing ? replacement?.value : undefined,
                removeFromRules: isRemoving,
                affectedScenarioIds: usage.map(({ id }) => id),
            },
            {
                onSuccess: () => {
                    onClose();
                    onDeleted();
                },
            },
        );
    }, [
        deleteIntervention,
        intervention.id,
        isReplacing,
        isRemoving,
        replacement,
        usage,
        onClose,
        onDeleted,
    ]);

    const confirmMessage: IntlMessage = useMemo(() => {
        if (isRemoving) {
            return MESSAGES.deleteInterventionRemoveAndDelete;
        }
        if (!isReplacing) {
            return MESSAGES.deleteIntervention;
        }
        return replacement
            ? {
                  ...MESSAGES.deleteInterventionReplaceWithAndDelete,
                  values: { replacement: replacement.label },
              }
            : MESSAGES.deleteInterventionReplaceAndDelete;
    }, [isRemoving, isReplacing, replacement]);

    return (
        <ConfirmCancelModal
            open
            id="delete-intervention-dialog"
            dataTestId="delete-intervention-dialog"
            titleMessage={MESSAGES.deleteInterventionConfirmTitle}
            onClose={onClose}
            closeDialog={onClose}
            onCancel={onClose}
            onConfirm={handleConfirm}
            allowConfirm={canConfirm}
            closeOnConfirm={false}
            confirmMessage={confirmMessage}
            cancelMessage={MESSAGES.cancel}
            maxWidth="sm"
        >
            {isUsed ? (
                <Stack spacing={2}>
                    <Alert severity="warning">
                        {formatMessage(
                            lockedCount > 0
                                ? MESSAGES.deleteInterventionLockedMessage
                                : MESSAGES.deleteInterventionUsedMessage,
                            countValues,
                        )}
                    </Alert>
                    <InterventionUsageList scenarios={usage} />
                    <FormControl disabled={lockedCount > 0}>
                        <FormLabel sx={styles.legend}>
                            {formatMessage(
                                MESSAGES.deleteInterventionRulesActionLegend,
                            )}
                        </FormLabel>
                        <RadioGroup
                            value={rulesAction ?? ''}
                            onChange={handleRulesActionChange}
                            sx={styles.radioGroup}
                        >
                            <RulesActionOption
                                value="replace"
                                title={formatMessage(
                                    MESSAGES.deleteInterventionReplaceOption,
                                )}
                            >
                                {isReplacing && (
                                    <ReplacementField
                                        options={replacementOptions}
                                        replacement={replacement}
                                        onChange={setReplacementId}
                                        interventionName={intervention.name}
                                        ruleCount={ruleCount}
                                    />
                                )}
                            </RulesActionOption>
                            <RulesActionOption
                                value="remove"
                                title={formatMessage(
                                    MESSAGES.deleteInterventionRemoveOption,
                                )}
                            >
                                {isRemoving && (
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                    >
                                        {formatMessage(
                                            MESSAGES.deleteInterventionRemoveHelper,
                                            countValues,
                                        )}
                                    </Typography>
                                )}
                            </RulesActionOption>
                        </RadioGroup>
                    </FormControl>
                    {rulesAction && (
                        <ConfirmNameField
                            name={intervention.name}
                            value={confirmName}
                            onChange={setConfirmName}
                        />
                    )}
                </Stack>
            ) : (
                <Typography>
                    {formatMessage(
                        MESSAGES.deleteInterventionUnusedMessage,
                        countValues,
                    )}
                </Typography>
            )}
        </ConfirmCancelModal>
    );
};
