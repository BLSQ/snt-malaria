import { describe, expect, it } from 'vitest';
import { csvFromGrid, GridRow, templateCsv } from './csvFromGrid';

const row = (partial: Partial<GridRow>): GridRow => ({
    orgUnitId: 1,
    adm1Name: 'Dakar',
    adm2Name: 'Dakar',
    value: '',
    ...partial,
});

describe('csvFromGrid', () => {
    it('writes the shared headers plus the layer code column', () => {
        const csv = csvFromGrid([row({ value: '18.4' })], 'malaria_tpr');
        expect(csv.split('\n')[0]).toBe(
            'ADM1_NAME,ADM2_NAME,ADM2_ID,malaria_tpr',
        );
    });

    it('emits one row per filled cell, in order', () => {
        const csv = csvFromGrid(
            [
                row({ orgUnitId: 10, adm2Name: 'Pikine', value: '22' }),
                row({ orgUnitId: 11, adm2Name: 'Rufisque', value: '5.5' }),
            ],
            'k',
        );
        expect(csv.split('\n').slice(1)).toEqual([
            'Dakar,Pikine,10,22',
            'Dakar,Rufisque,11,5.5',
        ]);
    });

    it('drops blank and whitespace-only cells', () => {
        const csv = csvFromGrid(
            [
                row({ orgUnitId: 1, value: '' }),
                row({ orgUnitId: 2, value: '   ' }),
                row({ orgUnitId: 3, value: '7' }),
            ],
            'k',
        );
        expect(csv.split('\n')).toHaveLength(2);
        expect(csv).toContain(',3,7');
    });

    it('trims the kept value and keeps non-numeric text', () => {
        const csv = csvFromGrid([row({ orgUnitId: 4, value: ' n/a ' })], 'k');
        expect(csv.split('\n')[1]).toBe('Dakar,Dakar,4,n/a');
    });

    it('quotes names containing a comma', () => {
        const csv = csvFromGrid(
            [row({ orgUnitId: 5, adm2Name: 'Foo, Bar', value: '1' })],
            'k',
        );
        expect(csv.split('\n')[1]).toBe('Dakar,"Foo, Bar",5,1');
    });

    it('escapes a layer code that contains a comma in the header', () => {
        const csv = csvFromGrid([row({ orgUnitId: 1, value: '2' })], 'a,b');
        expect(csv.split('\n')[0]).toBe('ADM1_NAME,ADM2_NAME,ADM2_ID,"a,b"');
    });
});

describe('templateCsv', () => {
    it('puts the new layer code in the header and leaves every value cell blank', () => {
        const csv = templateCsv(
            [
                { orgUnitId: 1, adm1Name: 'Dakar', adm2Name: 'Dakar' },
                { orgUnitId: 2, adm1Name: 'Thiès', adm2Name: 'Mbour' },
            ],
            'malaria_tpr',
        );
        expect(csv.split('\n')).toEqual([
            'ADM1_NAME,ADM2_NAME,ADM2_ID,malaria_tpr',
            'Dakar,Dakar,1,',
            'Thiès,Mbour,2,',
        ]);
    });
});
