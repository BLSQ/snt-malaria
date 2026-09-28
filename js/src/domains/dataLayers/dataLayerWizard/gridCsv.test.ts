import { describe, expect, it } from 'vitest';
import { parseYearlyCsv, templateCsv } from './gridCsv';
import { OrgUnitRow } from './orgUnitRows';

const row = (partial: Partial<OrgUnitRow>): OrgUnitRow => ({
    orgUnitId: 1,
    adm1Name: 'Dakar',
    adm2Name: 'Dakar',
    ...partial,
});

describe('templateCsv', () => {
    it('writes the shared headers plus one column per year', () => {
        const csv = templateCsv([row({})], [2024, 2025]);
        expect(csv.split('\n')[0]).toBe(
            'ADM1_NAME,ADM2_NAME,ADM2_ID,2024,2025',
        );
    });

    it('leaves every value cell blank, one row per org unit', () => {
        const csv = templateCsv(
            [
                row({ orgUnitId: 1, adm2Name: 'Dakar' }),
                row({ orgUnitId: 2, adm1Name: 'Thiès', adm2Name: 'Mbour' }),
            ],
            [2024],
        );
        expect(csv.split('\n')).toEqual([
            'ADM1_NAME,ADM2_NAME,ADM2_ID,2024',
            'Dakar,Dakar,1,',
            'Thiès,Mbour,2,',
        ]);
    });

    it('quotes names containing a comma', () => {
        const csv = templateCsv([row({ adm2Name: 'Foo, Bar' })], [2024]);
        expect(csv.split('\n')[1]).toBe('Dakar,"Foo, Bar",1,');
    });
});

describe('parseYearlyCsv', () => {
    it('reads filled cells by ADM2_ID and treats non-required numeric headers as years', () => {
        const text = [
            'ADM1_NAME,ADM2_NAME,ADM2_ID,2024,2025',
            'Dakar,Dakar,1,18.4,',
            'Dakar,Pikine,2,,7',
            'Thiès,Mbour,3,,',
        ].join('\n');
        expect(parseYearlyCsv(text)).toEqual({
            years: [2024, 2025],
            valuesByOrgUnit: {
                1: { 2024: '18.4' },
                2: { 2025: '7' },
            },
        });
    });

    it('supports a semicolon delimiter and quoted cells', () => {
        const text = 'ADM1_NAME;ADM2_NAME;ADM2_ID;2024\n"a";"b";5;"9"';
        expect(parseYearlyCsv(text)).toEqual({
            years: [2024],
            valuesByOrgUnit: { 5: { 2024: '9' } },
        });
    });

    it('keeps columns aligned when a district name is quoted and contains the delimiter', () => {
        const text = [
            'ADM1_NAME,ADM2_NAME,ADM2_ID,2024',
            'Dakar,"Foo, Bar",5,42',
        ].join('\n');
        expect(parseYearlyCsv(text)).toEqual({
            years: [2024],
            valuesByOrgUnit: { 5: { 2024: '42' } },
        });
    });

    it('returns nothing when ADM2_ID is missing', () => {
        const text = 'ADM1_NAME,ADM2_NAME,2024\nx,y,3';
        expect(parseYearlyCsv(text)).toEqual({
            years: [],
            valuesByOrgUnit: {},
        });
    });

    it('ignores non-year, non-required columns', () => {
        const text = [
            'ADM1_NAME,ADM2_NAME,ADM2_ID,notes,2024',
            'Dakar,Dakar,1,some note,5',
        ].join('\n');
        expect(parseYearlyCsv(text)).toEqual({
            years: [2024],
            valuesByOrgUnit: { 1: { 2024: '5' } },
        });
    });
});
