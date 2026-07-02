import React, {
    ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import { PopperProps } from '@mui/material/Popper';
import { useSafeIntl } from 'bluesquare-components';

import {
    OnboardingSpotlight,
    SpotlightShape,
} from '../components/OnboardingSpotlight';
import { MESSAGES } from '../domains/messages';

/**
 * Onboarding tours with optional documentation links: pass `documentation`
 * at tour scope for every step, or override per step inside `steps`.
 *
 * Visibility is a single derived predicate `isOpen` (enabled, not finished,
 * anchor mounted, not suppressed by a page click). A page-level click
 * persists the next step and hides the overlay until remount; **Next**,
 * **Got it**, **Skip**, and **Escape** behave as a classic tour — Next shows
 * the next step in the same session; Skip / Escape end the tour.
 */

/**
 * Optional link to external documentation shown in the onboarding bubble.
 * `label` defaults to the translated `MESSAGES.onboardingGoToDocs`.
 */
export type OnboardingDocumentation = {
    href: string;
    label?: string;
};

/**
 * One step of a tour. Per-step {@link OnboardingDocumentation} overrides the tour-level one.
 */
export type OnboardingStep = {
    title: string;
    description: ReactNode;
    /** Preferred side for the bubble. Defaults to `'bottom-start'`. */
    placement?: PopperProps['placement'];
    /** Spotlight shape. Defaults to `'circle'`. */
    shape?: SpotlightShape;
    /** Overrides tour-level documentation for this step only. */
    documentation?: OnboardingDocumentation;
};

type CommonArgs = {
    /** Stable id used as the `localStorage` key suffix. */
    id: string;
    /** Gating condition for the whole tour. */
    enabled: boolean;
    /** Shown on every step unless a step overrides with its own documentation. */
    documentation?: OnboardingDocumentation;
};

// Discriminated union: callers either pass a single step's fields inline,
// or a `steps` array. Mixing the two is a type error.
type SingleStepArgs = CommonArgs &
    Omit<OnboardingStep, 'documentation'> & {
        steps?: never;
    };

type MultiStepArgs = CommonArgs & {
    steps: OnboardingStep[];
    title?: never;
    description?: never;
    placement?: never;
    shape?: never;
};

type UseOnboardingArgs = SingleStepArgs | MultiStepArgs;

type UseOnboardingResult = {
    /** Convenience alias for `anchorRefs[0]`. */
    anchorRef: (node: HTMLElement | null) => void;
    /** One callback ref per step, in `steps` order. */
    anchorRefs: ((node: HTMLElement | null) => void)[];
    /** Render this anywhere in your tree; returns `null` when hidden. */
    element: ReactNode;
};

const STORAGE_KEY_PREFIX = 'snt_malaria.onboarding.';
const DONE = 'done';

const safeRead = (key: string): string | null => {
    try {
        if (typeof window === 'undefined') return null;
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
};

const safeWrite = (key: string, value: string) => {
    try {
        window.localStorage.setItem(key, value);
    } catch {
        // ignore unavailable storage; in-memory state still drives the session
    }
};

const readStep = (key: string, total: number): number => {
    const stored = safeRead(key);
    if (stored === DONE) return total;
    const parsed = Number(stored);
    return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), total) : 0;
};

const normalizeSteps = (args: UseOnboardingArgs): OnboardingStep[] => {
    if (args.steps) return args.steps;
    return [
        {
            title: args.title,
            description: args.description,
            placement: args.placement,
            shape: args.shape,
        },
    ];
};

export const useOnboarding = (args: UseOnboardingArgs): UseOnboardingResult => {
    const { formatMessage } = useSafeIntl();
    const { documentation: tourDocumentation } = args;
    const steps = normalizeSteps(args);
    const total = steps.length;
    const storageKey = `${STORAGE_KEY_PREFIX}${args.id}.step`;

    const [currentStep, setCurrentStep] = useState<number>(() =>
        readStep(storageKey, total),
    );

    // Anchors are stored in state (rather than refs) so the active anchor
    // triggers a re-render as soon as it mounts.
    const [anchors, setAnchors] = useState<(HTMLElement | null)[]>(() =>
        steps.map(() => null),
    );

    // After a page-level click, hide the overlay until the page remounts;
    // the persisted step counter still advances so the next visit shows the
    // following step.
    const [overlaySuppressed, setOverlaySuppressed] = useState(false);

    // One stable callback ref per index, rebuilt only when step count changes.
    const anchorRefs = useMemo(
        () =>
            Array.from(
                { length: total },
                (_, i) => (node: HTMLElement | null) => {
                    setAnchors(prev => {
                        if (prev[i] === node) return prev;
                        const next = prev.slice();
                        next[i] = node;
                        return next;
                    });
                },
            ),
        [total],
    );

    const advance = useCallback(() => {
        setCurrentStep(prev => {
            const next = Math.min(prev + 1, total);
            safeWrite(storageKey, next >= total ? DONE : String(next));
            return next;
        });
    }, [storageKey, total]);

    /**
     * Document-listener handler: a click anywhere on the page (outside the
     * tour card — the card stops propagation) advances the persisted step
     * and hides the overlay until the page remounts.
     */
    const handlePageClickAdvance = useCallback(() => {
        advance();
        setOverlaySuppressed(true);
    }, [advance]);

    const dismiss = useCallback(() => {
        setCurrentStep(total);
        safeWrite(storageKey, DONE);
    }, [storageKey, total]);

    const isFinished = currentStep >= total;
    const activeStep = isFinished ? null : steps[currentStep];
    const activeAnchor = isFinished ? null : (anchors[currentStep] ?? null);
    const isLastStep = currentStep === total - 1;
    // Single source of truth for "should the spotlight be on screen?".
    const isOpen =
        args.enabled &&
        !isFinished &&
        Boolean(activeAnchor) &&
        !overlaySuppressed;

    useEffect(() => {
        if (!isOpen) return undefined;
        document.addEventListener('click', handlePageClickAdvance);
        return () =>
            document.removeEventListener('click', handlePageClickAdvance);
    }, [isOpen, handlePageClickAdvance]);

    const primaryAction = useMemo(
        () => ({
            label: formatMessage(
                isLastStep
                    ? MESSAGES.onboardingDismiss
                    : MESSAGES.onboardingNext,
            ),
            onClick: advance,
        }),
        [isLastStep, advance, formatMessage],
    );

    // Skip only makes sense when there are more steps to skip past.
    const secondaryAction = useMemo(
        () =>
            isLastStep
                ? undefined
                : {
                      label: formatMessage(MESSAGES.onboardingSkip),
                      onClick: dismiss,
                  },
        [isLastStep, dismiss, formatMessage],
    );

    const documentationForSpotlight = useMemo(() => {
        if (!activeStep) return undefined;
        const cfg = activeStep.documentation ?? tourDocumentation;
        if (!cfg?.href) return undefined;
        return {
            label: cfg.label ?? formatMessage(MESSAGES.onboardingGoToDocs),
            href: cfg.href,
        };
    }, [activeStep, tourDocumentation, formatMessage]);

    const element =
        isOpen && activeStep ? (
            <OnboardingSpotlight
                anchorEl={activeAnchor}
                title={activeStep.title}
                description={activeStep.description}
                primaryAction={primaryAction}
                secondaryAction={secondaryAction}
                documentation={documentationForSpotlight}
                onEscape={dismiss}
                placement={activeStep.placement}
                shape={activeStep.shape}
            />
        ) : null;

    return { anchorRef: anchorRefs[0], anchorRefs, element };
};
