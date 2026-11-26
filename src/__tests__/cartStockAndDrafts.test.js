import {
    isStockTracked,
    allowsNegativeStock,
    getCartLineStockQty,
    getCartStockReservations,
    buildBaseStockMap,
    applyCartStockToMenu,
} from '../utils/cartStockUtils';
import {
    buildTableDraftSignature,
    buildTakeawayDraftSignature,
    mapOrderItemsToCart,
    buildHistorySaleOrderState,
} from '../utils/saleDraftSignature';

describe('cartStockUtils.js', () => {
    test('isStockTracked and allowsNegativeStock check flags and itemType', () => {
        expect(isStockTracked({ itemType: 'STOCK' })).toBe(true);
        expect(isStockTracked({ stockApplicable: false, itemType: 'STOCK' })).toBe(false);
        expect(isStockTracked({ ingredients: [{ itemId: 'ing1' }] })).toBe(true);
        expect(allowsNegativeStock({ stockSettings: { allowNegativeStock: true } })).toBe(true);
    });

    test('getCartLineStockQty accounts for secondary unit and variant factor', () => {
        expect(getCartLineStockQty({ quantity: 2, selectedVariant: { quantityFactor: 0.5 } })).toBe(1);
        expect(getCartLineStockQty({ quantity: 10, selectedUnit: 'SECONDARY', conversionFactor: 2 })).toBe(5);
    });

    test('getCartStockReservations, buildBaseStockMap, and applyCartStockToMenu deduct reserved stock', () => {
        const menu = [{ _id: 'p1', itemType: 'STOCK', quantityOnHand: 10 }];
        const cart = [{ _id: 'p1', itemType: 'STOCK', quantity: 3 }];
        const baseMap = buildBaseStockMap(menu);
        expect(baseMap.p1).toBe(10);

        const reservations = getCartStockReservations(cart);
        expect(reservations.get('p1')).toBe(3);

        const updatedMenu = applyCartStockToMenu(menu, cart, baseMap);
        expect(updatedMenu[0].quantityOnHand).toBe(7);
    });
});

describe('saleDraftSignature.js', () => {
    test('buildTableDraftSignature and buildTakeawayDraftSignature produce deterministic JSON', () => {
        const sig1 = buildTableDraftSignature({
            tableId: 'tbl1',
            tableOrder: { orderId: 'o1', items: [{ id: 'i1', quantity: 2, price: 50 }] },
        });
        const sig2 = buildTableDraftSignature({
            tableId: 'tbl1',
            tableOrder: { orderId: 'o1', items: [{ id: 'i1', quantity: 2, price: 50 }] },
        });
        expect(sig1).toBe(sig2);

        const tkSig = buildTakeawayDraftSignature({
            activeTabId: 1,
            takeawayOrder: { items: [] },
            activeOrderType: 'TAKEAWAY',
            takeawayCustName: 'Ali',
            takeawayCustPhone: '9876543210',
        });
        expect(tkSig).toContain('"activeTabId":1');
        expect(tkSig).toContain('"customerName":"Ali"');
    });

    test('mapOrderItemsToCart and buildHistorySaleOrderState map backend order to cart state', () => {
        const menu = [{ _id: 'i1', name: 'Biryani', price: 180, taxPercent: 5 }];
        const mapped = mapOrderItemsToCart([{ itemId: 'i1', quantity: 2, price: 180 }], menu);
        expect(mapped[0].name).toBe('Biryani');
        expect(mapped[0].quantity).toBe(2);

        const historyState = buildHistorySaleOrderState({
            _id: 'ord1',
            orderNumber: 'ORD-00010',
            orderType: 'DIRECT_SALE',
            items: [{ itemId: 'i1', quantity: 1, price: 180 }],
        }, menu);
        expect(historyState.isHistoryEdit).toBe(true);
        expect(historyState.orderNumber).toBe('ORD-00010');
    });
});
