import React, { ComponentProps, FC, useEffect, useState } from 'react';
import { LoadingSpinner } from 'bluesquare-components';

const DEFAULT_DELAY_MS = 500;

type Props = ComponentProps<typeof LoadingSpinner> & {
    delay?: number;
};

/**
 * A `LoadingSpinner` that only appears once loading has lasted longer than `delay`.
 * Candidate for bluesquare-components as an optional `delay` prop on `LoadingSpinner`.
 */
export const DelayedLoadingSpinner: FC<Props> = ({
    delay = DEFAULT_DELAY_MS,
    ...spinnerProps
}) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);

    return isVisible ? <LoadingSpinner {...spinnerProps} /> : null;
};
