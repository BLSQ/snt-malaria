import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useDataLayerWizard, WIZARD_STEPS } from './useDataLayerWizard';

describe('useDataLayerWizard', () => {
    it('starts on the Type step with a standard layer', () => {
        const { result } = renderHook(() => useDataLayerWizard());
        expect(result.current.activeStep).toBe(WIZARD_STEPS.TYPE);
        expect(result.current.staged.layerType).toBe('data');
    });

    it('clamps navigation to the first and last step (Data is last)', () => {
        const { result } = renderHook(() => useDataLayerWizard());
        act(() => result.current.goBack());
        expect(result.current.activeStep).toBe(WIZARD_STEPS.TYPE);
        act(() => {
            result.current.goNext();
            result.current.goNext();
            result.current.goNext();
            result.current.goNext();
        });
        expect(result.current.activeStep).toBe(WIZARD_STEPS.DATA);
    });

    it('orders the steps Type, Details, Legend, Data', () => {
        expect(WIZARD_STEPS.TYPE).toBeLessThan(WIZARD_STEPS.DETAILS);
        expect(WIZARD_STEPS.DETAILS).toBeLessThan(WIZARD_STEPS.LEGEND);
        expect(WIZARD_STEPS.LEGEND).toBeLessThan(WIZARD_STEPS.DATA);
    });

    it('reset() clears every staged field and returns to the first step', () => {
        const { result } = renderHook(() => useDataLayerWizard());
        act(() => {
            result.current.setLayerType('composite');
            result.current.setGridValue(3, '9');
            result.current.patch({
                csvFile: new File(['x'], 'x.csv'),
                csvYear: 2020,
                compositeLayerId: 42,
            });
            result.current.goNext();
        });
        act(() => result.current.reset());
        expect(result.current.activeStep).toBe(WIZARD_STEPS.TYPE);
        expect(result.current.staged).toEqual({
            layerType: 'data',
            method: 'csv',
            csvFile: null,
            csvYear: expect.any(Number),
            gridValues: {},
        });
    });

    it('drops staged CSV / grid choices when leaving the standard type', () => {
        const { result } = renderHook(() => useDataLayerWizard());
        act(() => {
            result.current.setGridValue(7, '42');
            result.current.patch({
                csvFile: new File(['x'], 'x.csv'),
                method: 'manual',
            });
        });
        act(() => result.current.setLayerType('composite'));
        expect(result.current.staged.csvFile).toBeNull();
        expect(result.current.staged.gridValues).toEqual({});
        expect(result.current.staged.method).toBe('csv');
    });

    it('clears a staged composite shell id when switching away from composite', () => {
        const { result } = renderHook(() => useDataLayerWizard());
        act(() => {
            result.current.setLayerType('composite');
            result.current.patch({ compositeLayerId: 99 });
        });
        expect(result.current.staged.compositeLayerId).toBe(99);
        act(() => result.current.setLayerType('data'));
        expect(result.current.staged.compositeLayerId).toBeUndefined();
    });

    it('flags the composite graph step only on the last (Data) step of a composite', () => {
        const { result } = renderHook(() => useDataLayerWizard());
        act(() => result.current.setLayerType('composite'));
        expect(result.current.isCompositeGraphStep).toBe(false);
        act(() => {
            result.current.goNext();
            result.current.goNext();
        });
        // On Legend now, not yet the graph step.
        expect(result.current.activeStep).toBe(WIZARD_STEPS.LEGEND);
        expect(result.current.isCompositeGraphStep).toBe(false);
        act(() => result.current.goNext());
        expect(result.current.activeStep).toBe(WIZARD_STEPS.DATA);
        expect(result.current.isCompositeGraphStep).toBe(true);
    });
});
