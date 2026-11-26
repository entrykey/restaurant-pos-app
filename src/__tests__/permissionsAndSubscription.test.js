import { hasPermission, hasPermissionFor } from '../utils/permissions';
import {
    computeUserHasActiveSubscription,
    isSubscriptionPaymentPending,
    getSubscriptionPlanLabel,
} from '../utils/subscriptionStatus';

describe('permissions.js', () => {
    test('superAdmin has access to non-expense modules', () => {
        const superUser = { isSuperAdmin: true };
        expect(hasPermission(superUser, 'organization.branch.create')).toBe(true);
        expect(hasPermissionFor(superUser, 'orders', 'order', 'create')).toBe(true);
        // Expense targets are gated even for superAdmin unless explicitly permitted
        expect(hasPermission(superUser, 'expenses.view')).toBe(false);
    });

    test('unsubscribed shop user only accesses core modules', () => {
        const expiredUser = {
            shop_id: 's1',
            subscription: { active: false },
            permissions: { DASHBOARD: ['view'], ORDERS: ['order.create'] },
        };
        expect(hasPermissionFor(expiredUser, 'orders', 'order', 'create')).toBe(false);
    });

    test('null user has no permissions', () => {
        expect(hasPermission(null, 'orders.order.create')).toBe(false);
        expect(hasPermissionFor(null, 'orders', 'order', 'create')).toBe(false);
    });
});

describe('subscriptionStatus.js', () => {
    test('computeUserHasActiveSubscription evaluates org status and expiry', () => {
        expect(computeUserHasActiveSubscription({ isSuperAdmin: true }, null)).toBe(true);
        expect(computeUserHasActiveSubscription({}, { _id: 'o1', subscriptionStatus: 'active', subscriptionEndDate: '2099-01-01' })).toBe(true);
        expect(computeUserHasActiveSubscription({}, { _id: 'o1', subscriptionStatus: 'active', subscriptionEndDate: '2020-01-01' })).toBe(false);
        expect(computeUserHasActiveSubscription({}, { _id: 'o1', subscriptionStatus: 'inactive' })).toBe(false);
    });

    test('isSubscriptionPaymentPending and getSubscriptionPlanLabel', () => {
        expect(isSubscriptionPaymentPending({ subscriptionStatus: 'pending_payment' })).toBe(true);
        expect(isSubscriptionPaymentPending({ subscriptionStatus: 'active' })).toBe(false);
        expect(getSubscriptionPlanLabel({ subscription: { active: true, plan: 'Pro' } }, {})).toBe('Pro');
        expect(getSubscriptionPlanLabel({}, { planName: 'Starter' })).toBe('Starter');
    });
});
