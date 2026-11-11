import { createContext, useContext } from 'react';
import { noOp } from 'Iaso/utils';

export const WarningBoxRevealContext = createContext<() => void>(noOp);

/** Scrolls the enclosing `WarningBox` into view, e.g. after its content expanded. */
export const useRevealWarningBox = (): (() => void) =>
    useContext(WarningBoxRevealContext);
