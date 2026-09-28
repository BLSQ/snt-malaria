import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
    EDIT_STEPS,
    useDataLayerWizard,
    WIZARD_STEPS,
} from './useDataLayerWizard';

describe('useDataLayerWizard', () => {
    it('starts on the Type step with a standard layer', () => {
        const { result } = renderHook(() => useDataLayerWizard());
        expect(result.current.activeStep).toBe(WIZARD_STEPS.TYPE);
        expect(result.current.staged.layerType).toBe('data');
    });

    it('clamps navigation to the first and last step (Legend is last)', () => {
        const { result } = renderHook(() => useDataLayerWizard());
        act(() => result.current.goBack());
        expect(result.current.activeStep).toBe(WIZARD_STEPS.TYPE);
        act(() => {
            result.current.goNext();
            result.current.goNext();
            result.current.goNext();
            result.current.goNext();
        });
        expect(result.current.activeStep).toBe(WIZARD_STEPS.LEGEND);
    });

    it('orders the steps Type, Details, Data, Legend', () => {
        expect(WIZARD_STEPS.TYPE).toBeLessThan(WIZARD_STEPS.DETAILS);
        expect(WIZARD_STEPS.DETAILS).toBeLessThan(WIZARD_STEPS.DATA);
        expect(WIZARD_STEPS.DATA).toBeLessThan(WIZARD_STEPS.LEGEND);
    });

    it('start(EDIT_STEPS) runs only Details -> Legend, skipping Data', () => {
        const { result } = renderHook(() => useDataLayerWizard());
        act(() => result.current.start(EDIT_STEPS));
        expect(result.current.activeStep).toBe(WIZARD_STEPS.DETAILS);
        expect(result.current.activeStepIndex).toBe(0);
        expect(result.current.lastStep).toBe(WIZARD_STEPS.LEGEND);
        act(() => result.current.goBack());
        expect(result.current.activeStep).toBe(WIZARD_STEPS.DETAILS);
        act(() => result.current.goNext());
        expect(result.current.activeStep).toBe(WIZARD_STEPS.LEGEND);
    });

    it("start() can seed staged state, e.g. an edit run's known layer type", () => {
        const { result } = renderHook(() => useDataLayerWizard());
        act(() => result.current.start(EDIT_STEPS, { layerType: 'openhexa' }));
        expect(result.current.staged.layerType).toBe('openhexa');
    });

    it('reset() clears every staged field and returns to the first step', () => {
        const { result } = renderHook(() => useDataLayerWizard());
        act(() => {
            result.current.setLayerType('composite');
            result.current.setGridValue(3, 2024, '9');
            result.current.patch({ compositeLayerId: 42 });
            result.current.goNext();
        });
        act(() => result.current.reset());
        expect(result.current.activeStep).toBe(WIZARD_STEPS.TYPE);
        expect(result.current.staged).toEqual({
            layerType: 'data',
            gridValues: {},
            gridYears: [expect.any(Number)],
        });
    });

    it('drops staged table entries when leaving the standard type', () => {
        const { result } = renderHook(() => useDataLayerWizard());
        act(() => {
            result.current.setGridValue(7, 2024, '42');
            result.current.addGridYear(2025);
        });
        act(() => result.current.setLayerType('composite'));
        expect(result.current.staged.gridValues).toEqual({});
        expect(result.current.staged.gridYears).toEqual([expect.any(Number)]);
    });

    it('addGridYear adds a sorted, deduplicated column', () => {
        const { result } = renderHook(() => useDataLayerWizard());
        const initialYear = result.current.staged.gridYears[0];
        act(() => {
            result.current.addGridYear(initialYear + 2);
            result.current.addGridYear(initialYear + 1);
            result.current.addGridYear(initialYear + 1);
        });
        expect(result.current.staged.gridYears).toEqual([
            initialYear,
            initialYear + 1,
            initialYear + 2,
        ]);
    });

    it('removeGridYear drops the column and its values', () => {
        const { result } = renderHook(() => useDataLayerWizard());
        const [year] = result.current.staged.gridYears;
        act(() => {
            result.current.addGridYear(year + 1);
            result.current.setGridValue(1, year, '10');
            result.current.setGridValue(1, year + 1, '20');
        });
        act(() => result.current.removeGridYear(year));
        expect(result.current.staged.gridYears).toEqual([year + 1]);
        expect(result.current.staged.gridValues[1]).toEqual({
            [year + 1]: '20',
        });
    });

    it('mergeGridFromCsv adds new year columns and fills values without discarding existing ones', () => {
        const { result } = renderHook(() => useDataLayerWizard());
        const [year] = result.current.staged.gridYears;
        act(() => result.current.setGridValue(1, year, 'kept'));
        act(() =>
            result.current.mergeGridFromCsv([year + 1], {
                1: { [year + 1]: 'new' },
                2: { [year + 1]: '5' },
            }),
        );
        expect(result.current.staged.gridYears).toEqual([year, year + 1]);
        expect(result.current.staged.gridValues[1]).toEqual({
            [year]: 'kept',
            [year + 1]: 'new',
        });
        expect(result.current.staged.gridValues[2]).toEqual({
            [year + 1]: '5',
        });
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

    it('clears a staged created MetricType id when switching to a different layer type', () => {
        const { result } = renderHook(() => useDataLayerWizard());
        act(() => {
            result.current.setLayerType('openhexa');
            result.current.patch({ createdMetricTypeId: 12 });
        });
        expect(result.current.staged.createdMetricTypeId).toBe(12);
        act(() => result.current.setLayerType('data'));
        expect(result.current.staged.createdMetricTypeId).toBeUndefined();
    });

    it('keeps a staged created MetricType id when reselecting the same layer type', () => {
        const { result } = renderHook(() => useDataLayerWizard());
        act(() => {
            result.current.setLayerType('data');
            result.current.patch({ createdMetricTypeId: 7 });
        });
        act(() => result.current.setLayerType('data'));
        expect(result.current.staged.createdMetricTypeId).toBe(7);
    });

    it('flags the composite graph step only on the Data step of a composite', () => {
        const { result } = renderHook(() => useDataLayerWizard());
        act(() => result.current.setLayerType('composite'));
        expect(result.current.isCompositeGraphStep).toBe(false);
        act(() => {
            result.current.goNext();
            result.current.goNext();
        });
        // On Data now, not the Legend step yet.
        expect(result.current.activeStep).toBe(WIZARD_STEPS.DATA);
        expect(result.current.isCompositeGraphStep).toBe(true);
        act(() => result.current.goNext());
        expect(result.current.activeStep).toBe(WIZARD_STEPS.LEGEND);
        expect(result.current.isCompositeGraphStep).toBe(false);
    });
});
