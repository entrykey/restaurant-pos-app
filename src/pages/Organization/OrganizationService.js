/**
 * Organization & Branch data structures and initial state.
 * Tax & location rules belong to Branch; Organization holds default country, currency, tax system.
 */
import { shopService, subscriptionService, branchService } from "../../services/api";

export const TAX_SYSTEMS = Object.freeze({
  GST: "GST",
  VAT: "VAT",
  SALES_TAX: "Sales Tax",
});

export const BRANCH_STATUS = Object.freeze({
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  DISABLED: "DISABLED",
});

export const DEFAULT_COUNTRIES = [
  { code: "IN", name: "India" },
  { code: "AE", name: "UAE" },
  { code: "US", name: "USA" },
  { code: "GB", name: "UK" },
  { code: "SA", name: "Saudi Arabia" },
];

export const CURRENCIES = [
  { code: "INR", name: "Indian Rupee" },
  { code: "AED", name: "UAE Dirham" },
  { code: "USD", name: "US Dollar" },
  { code: "GBP", name: "British Pound" },
  { code: "SAR", name: "Saudi Riyal" },
];

/**
 * Subscription plans for upgrade options.
 * Backend can replace with API response.
 */
export const SUBSCRIPTION_PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 0,
    currency: "INR",
    priceLabel: "Free",
    branchesLimit: 1,
    features: ["1 Branch", "POS & Orders", "Basic Reports", "Email support"],
    highlighted: false,
  },
  {
    id: "growth",
    name: "Growth",
    price: 1999,
    currency: "INR",
    priceLabel: "INR 1,999/mo",
    branchesLimit: 5,
    features: ["Up to 5 Branches", "Everything in Starter", "Advanced Reports", "Multi-branch KDS", "Priority support"],
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 4999,
    currency: "INR",
    priceLabel: "INR 4,999/mo",
    branchesLimit: -1,
    branchesLabel: "Unlimited",
    features: ["Unlimited Branches", "Everything in Growth", "Dedicated account manager", "Custom integrations", "SLA & onboarding"],
    highlighted: false,
  },
];

export const fetchOrganizationData = async (userId, customShopId = null) => {
  try {
    let data;
    if (customShopId) {
      data = await shopService.getOrganizationDataByShopId(customShopId);
    } else {
      data = await shopService.getShopDataByUserId(userId);
    }

    console.log("OrganizationService: fetchOrganizationData raw response:", data);

    if (!data || !data.shop) {
      throw new Error("Invalid data received from server");
    }

    const orgData = {
      id: data.shop._id,
      businessName: data.shop.name,
      ownerName: data.shop.ownerName || data.shop.user_id?.name || "",
      ownerEmail: data.shop.ownerEmail || data.shop.user_id?.email || "",
      ownerContact: data.shop.ownerContact || "",
      logoUrl: data.shop.logoUrl || null,
      // Only use values saved on the shop by the owner — no branch/schema fallbacks
      defaultCountry: data.shop.defaultCountryCode ?? null,
      defaultCurrency: data.shop.defaultCurrencyCode ?? null,
      defaultTaxSystem: data.shop.defaultTaxSystem ?? null,
      defaultUpiId: data.shop.defaultUpiId ?? null,
      // If data.plan is null, set subscriptionPlanId to null so UI knows no plan is active
      subscriptionPlanId: data.plan ? data.plan._id : null,
      subscriptionStatus: data.subscription?.status || 'inactive',
      isTrial: data.subscription?.is_trial || false,
      subscriptionEndDate: data.subscription?.end_date || null,
      planName: data.plan ? (data.plan.name === 'Trail' ? 'Trial' : data.plan.name) : 'No Active Plan',
      planPriceLabel: data.plan
        ? `${data.plan.currency} ${data.plan.pricing?.find(p => p.cycle === 'monthly')?.price ?? data.plan.price ?? 0}/mo`
        : 'Subscribe to use',
      businessType: data.shop.businessType?._id || data.shop.businessType || null,
    };

    const branchData = data.branches.map(b => ({
      id: b._id,
      organizationId: b.shopId,
      name: b.name,
      address: {
        line1: b.address.line1,
        line2: b.address.line2,
        city: b.address.city,
        state: (typeof b.address.state === 'object' ? b.address.state?.name : b.address.state) || "",
        country: (typeof b.address.country === 'object' ? b.address.country?.name : b.address.country) || "",
        pincode: b.address.pincode
      },
      taxConfig: {
        taxSystem: b.taxProfile?.taxSystem || TAX_SYSTEMS.GST,
        gstin: b.taxProfile?.registrationNumber || "",
        isGstRegistered: !!b.taxProfile?.registrationNumber,
        allowInterState: b.taxProfile?.isInterStateAllowed || false
      },
      upiId: b.upiId || "",
      currency: b.currency?.code || "INR",
      isMainBranch: b.isMainBranch,
      status: b.status
    }));

    const availablePlans = (data.plans || []).map(p => {
      const monthlyPrice = p.pricing.find(pr => pr.cycle === 'monthly')?.price || 0;
      return {
        id: p._id,
        name: p.name,
        price: monthlyPrice,
        currency: p.currency,
        priceLabel: `${p.currency} ${monthlyPrice}/mo`,
        branchesLimit: p.limits.branches,
        branchesLabel: `${p.limits.branches} Branches`,
        features: [
          `${p.limits.branches} Branches`,
          `${p.limits.users} Users`,
          `${p.limits.products} Products`,
          `${p.limits.ordersPerMonth} Orders/mo`
        ],
        highlighted: false,
        hasTrial: p.hasTrial,
        trialDurationDays: p.trialDurationDays
      };
    });

    return {
      organization: orgData,
      branches: branchData,
      plans: availablePlans
    };

  } catch (error) {
    console.error("Error in fetchOrganizationData service:", error);
    throw error;
  }
};

export const startTrial = async (shopId, planId) => {
  try {
    const payload = {
      shop_id: shopId,
      plan_id: planId,
      billing_cycle: "monthly",
    };
    return await subscriptionService.create(payload);
  } catch (error) {
    console.error("Error starting trial:", error);
    throw error;
  }
};

export const fetchLocationByPincode = async (countryCode, pincode) => {
  return await shopService.getLocationByPincode(countryCode, pincode);
};

export const fetchCurrentLocation = async (lat, lon) => {
  return await shopService.getAddressByCoordinates(lat, lon);
};

export const saveBranch = async (branchData) => {
  try {
    const payload = {
      shopId: branchData.organizationId,
      name: branchData.name,
      isMainBranch: branchData.isMainBranch,
      status: branchData.status,
      address: {
        line1: branchData.address.line1,
        line2: branchData.address.line2,
        city: branchData.address.city,
        state: { name: branchData.address.state, code: "" },
        country: { name: branchData.address.country, code: "IN" },
        pincode: branchData.address.pincode
      },
      taxProfile: {
        taxSystem: branchData.taxConfig.taxSystem,
        registrationNumber: branchData.taxConfig.gstin,
        isInterStateAllowed: branchData.taxConfig.allowInterState
      },
      currency: {
        code: branchData.currency
      },
      upiId: branchData.upiId
    };

    if (branchData.id) {
      return await branchService.update(branchData.id, payload);
    } else {
      return await branchService.create(payload);
    }
  } catch (error) {
    console.error("Error saving branch:", error);
    throw error;
  }
};

export const deleteBranch = async (branchId) => {
  try {
    return await branchService.delete(branchId);
  } catch (error) {
    console.error("Error deleting branch:", error);
    throw error;
  }
};

export const initialOrganization = {
  id: null,
  businessName: "",
  ownerName: "",
  ownerEmail: "",
  defaultCountry: null,
  defaultCurrency: null,
  defaultTaxSystem: null,
  subscriptionPlanId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const initialBranches = [];
