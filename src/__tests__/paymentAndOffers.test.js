import { getOrderPaymentDetails, getPurchasePaymentDetails, formatOrderTextSummary } from '../utils/paymentUtils';
import { isOfferValidToday, applyBogoQuantity, syncItemBogoQuantity } from '../utils/posOfferHelpers';

describe('paymentUtils.js', () => {
    test('getOrderPaymentDetails handles null, split payments, and full payment', () => {
        expect(getOrderPaymentDetails(null).paymentStatus).toBe('UNPAID');

        const splitOrder = {
            grandTotal: 300,
            payments: [
                { paymentMethod: 'CASH', amount: 100 },
                { paymentMethod: 'UPI', amount: 200 },
            ],
        };
        const res = getOrderPaymentDetails(splitOrder);
        expect(res.paymentStatus).toBe('PAID');
        expect(res.paidAmount).toBe(300);
        expect(res.balanceAmount).toBe(0);
        expect(res.paymentMethod).toBe('CASH + UPI');
        expect(res.paymentBreakdown).toHaveLength(2);
    });

    test('getPurchasePaymentDetails handles partial and paid purchases', () => {
        expect(getPurchasePaymentDetails(null).paymentStatus).toBe('UNPAID');
        const partial = getPurchasePaymentDetails({ grandTotal: 500, paidAmount: 200 });
        expect(partial.paymentStatus).toBe('PARTIAL');
        expect(partial.balanceAmount).toBe(300);

        const paid = getPurchasePaymentDetails({ grandTotal: 500, paidAmount: 500 });
        expect(paid.paymentStatus).toBe('PAID');
        expect(paid.balanceAmount).toBe(0);
    });

    test('formatOrderTextSummary builds readable invoice summary', () => {
        const text = formatOrderTextSummary({
            shopName: 'Perota Hut',
            order: {
                invoiceNumber: 'INV-001',
                orderNumber: 'ORD-00001',
                grandTotal: 150,
                paidAmount: 150,
                paymentMethod: 'UPI',
                items: [{ name: 'Parotta', quantity: 3, price: 50 }],
            },
        });
        expect(text).toContain('Perota Hut');
        expect(text).toContain('INV-001');
        expect(text).toContain('3x Parotta');
    });
});

describe('posOfferHelpers.js', () => {
    const today = new Date().toISOString().split('T')[0];
    const bogoOffer = {
        name: 'Buy 2 Get 1',
        isActive: true,
        startDate: today,
        endDate: today,
        offerType: 'BUY_X_GET_Y',
        condition: { applyOn: 'ITEM', itemIds: ['item1'], minQuantity: 2 },
        reward: { rewardType: 'FREE_ITEM', rewardQuantity: 1, rewardSelectionStrategy: 'SAME_ITEM' },
    };

    test('isOfferValidToday checks active flag and date range', () => {
        expect(isOfferValidToday(bogoOffer)).toBe(true);
        expect(isOfferValidToday({ ...bogoOffer, isActive: false })).toBe(false);
        expect(isOfferValidToday({ ...bogoOffer, endDate: '2020-01-01' })).toBe(false);
    });

    test('applyBogoQuantity and syncItemBogoQuantity add free items when threshold met', () => {
        expect(applyBogoQuantity(1, 'item1', [bogoOffer])).toBe(1);
        expect(applyBogoQuantity(2, 'item1', [bogoOffer])).toBe(3);
        expect(applyBogoQuantity(4, 'item1', [bogoOffer])).toBe(6);

        const synced = syncItemBogoQuantity({ _id: 'item1', paidQuantity: 2, quantity: 2 }, [bogoOffer]);
        expect(synced.quantity).toBe(3);
        expect(synced.freeQuantity).toBe(1);
        expect(synced.bogoOfferName).toBe('Buy 2 Get 1');
    });
});
