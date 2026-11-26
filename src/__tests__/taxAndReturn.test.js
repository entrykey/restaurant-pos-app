import { resolveIsExclusiveTax, findTaxForItem } from '../utils/taxUtils';
import {
    getOrderPaidRatio,
    getAdjustedUnitRefund,
    findOrderItem,
    calculateReturnRefundTotal,
    withAdjustedReturnPrices,
} from '../utils/returnAmount';

describe('taxUtils.js', () => {
    const taxes = [
        { _id: 't1', percentage: 5, taxType: 'INCLUSIVE' },
        { _id: 't2', percentage: 5, taxType: 'EXCLUSIVE' },
        { _id: 't3', percentage: 18, taxType: 'EXCLUSIVE' },
    ];

    test('resolveIsExclusiveTax checks item flag and tax master', () => {
        expect(resolveIsExclusiveTax({ isExclusiveTax: true }, null)).toBe(true);
        expect(resolveIsExclusiveTax({ isExclusiveTax: false }, { taxType: 'EXCLUSIVE' })).toBe(true);
        expect(resolveIsExclusiveTax({ taxId: { taxType: 'EXCLUSIVE' } }, null)).toBe(true);
        expect(resolveIsExclusiveTax({ isExclusiveTax: false }, { taxType: 'INCLUSIVE' })).toBe(false);
    });

    test('findTaxForItem resolves by taxId, conflict override, and rate fallback', () => {
        expect(findTaxForItem({ taxId: 't1' }, taxes)?._id).toBe('t1');
        // Conflict: item wants exclusive at 5% while linked taxId t1 is inclusive
        expect(findTaxForItem({ taxId: 't1', taxPercent: 5, isExclusiveTax: true }, taxes)?._id).toBe('t2');
        // Fallback by rate & type
        expect(findTaxForItem({ taxPercent: 18, isExclusiveTax: true }, taxes)?._id).toBe('t3');
        expect(findTaxForItem({ taxPercent: 0 }, taxes)).toBeUndefined();
    });
});

describe('returnAmount.js', () => {
    const order = {
        grandTotal: 180, // 10% bill discount from 200 gross
        items: [
            { itemId: 'i1', quantity: 2, price: 50, totalAmount: 100, taxAmount: 0 },
            { itemId: { _id: 'i2' }, quantity: 1, price: 100, totalAmount: 100, taxAmount: 0 },
        ],
    };

    test('getOrderPaidRatio computes discount-adjusted ratio', () => {
        expect(getOrderPaidRatio(order)).toBeCloseTo(0.9, 5);
        expect(getOrderPaidRatio({ items: [] })).toBe(1);
    });

    test('getAdjustedUnitRefund and calculateReturnRefundTotal prorate refunds', () => {
        expect(getAdjustedUnitRefund(order.items[0], order)).toBe(45);
        expect(findOrderItem(order, 'i2')?.price).toBe(100);
        expect(calculateReturnRefundTotal(order, [{ itemId: 'i1', quantity: 1, price: 50 }])).toBe(45);
    });

    test('withAdjustedReturnPrices updates price on matched items', () => {
        const res = withAdjustedReturnPrices(order, [{ itemId: 'i2', quantity: 1, price: 100 }]);
        expect(res[0].price).toBe(90);
    });
});
