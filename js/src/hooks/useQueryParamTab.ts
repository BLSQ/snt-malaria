import React, { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const TAB_PARAM = 'tab';

/**
 * Keeps the active tab in the `tab` query param. Missing or unknown values
 * (e.g. tabs that were removed or moved to another page) fall back to the
 * default, and the URL is corrected so the tab is always valid and
 * shareable/bookmarkable.
 */
export const useQueryParamTab = <T extends string>(
    tabs: readonly T[],
    defaultTab: T,
): [T, (event: React.SyntheticEvent, newTab: T) => void] => {
    const [searchParams, setSearchParams] = useSearchParams();
    const tabParam = searchParams.get(TAB_PARAM) as T | null;
    const tab = tabParam && tabs.includes(tabParam) ? tabParam : defaultTab;

    const handleChangeTab = useCallback(
        (_event: React.SyntheticEvent, newTab: T) => {
            const next = new URLSearchParams(searchParams);
            next.set(TAB_PARAM, newTab);
            setSearchParams(next, { replace: true });
        },
        [searchParams, setSearchParams],
    );

    useEffect(() => {
        if (searchParams.get(TAB_PARAM) !== tab) {
            const next = new URLSearchParams(searchParams);
            next.set(TAB_PARAM, tab);
            setSearchParams(next, { replace: true });
        }
    }, [searchParams, tab, setSearchParams]);

    return [tab, handleChangeTab];
};
