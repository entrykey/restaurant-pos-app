/**
 * Subscription display logic shared by AppContent, Sidebar, Navbar.
 * Prefer organization payload (same source as Organization page) over JWT snapshot.
 */
export const LIVE_SUBSCRIPTION_STATUSES = ["active", "trial", "grace", "base", "free", "paid"];

export function computeUserHasActiveSubscription(user, organization) {
    if (organization?.canWrite === true) return true;
    if (organization?.trialRunStatus === "approved") return true;

    const orgId = organization?.id ?? organization?._id;
    if (orgId != null && orgId !== "") {
        const st = String(organization.subscriptionStatus || "inactive").toLowerCase();
        if (LIVE_SUBSCRIPTION_STATUSES.includes(st)) {
            const endRaw = organization.subscriptionEndDate;
            if (endRaw) {
                const end = new Date(endRaw);
                if (!Number.isNaN(end.getTime()) && end < new Date()) return false;
            }
            return true;
        }
        return false;
    }
    return user?.subscription?.active === true;
}

export function isSubscriptionPaymentPending(organization) {
    const st = String(organization?.subscriptionStatus || "").toLowerCase();
    return st === "pending_payment" || st === "pending";
}

/** Plan name for sidebar badge (not including " PLAN " suffix). */
export function getSubscriptionPlanLabel(user, organization) {
    if (user?.subscription?.active && user?.subscription?.plan) {
        return user.subscription.plan;
    }
    const pn = organization?.planName;
    if (pn && pn !== "Waiting for payment confirmation" && pn !== "No Active Plan") {
        return pn;
    }
    if (user?.subscription?.plan) return user.subscription.plan;
    return "Active";
}
