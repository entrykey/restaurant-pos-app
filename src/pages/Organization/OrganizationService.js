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
    priceLabel: "₹1,999/mo",
    branchesLimit: 5,
    features: ["Up to 5 Branches", "Everything in Starter", "Advanced Reports", "Multi-branch KDS", "Priority support"],
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 4999,
    currency: "INR",
    priceLabel: "₹4,999/mo",
    branchesLimit: -1,
    branchesLabel: "Unlimited",
    features: ["Unlimited Branches", "Everything in Growth", "Dedicated account manager", "Custom integrations", "SLA & onboarding"],
    highlighted: false,
  },
];

export const fetchOrganizationData = async (userId) => {
  try {
    const data = await shopService.getShopDataByUserId(userId);

    if (!data || !data.shop) {
      throw new Error("Invalid data received from server");
    }

    const orgData = {
      id: data.shop._id,
      businessName: data.shop.name,
      ownerName: data.shop.ownerName,
      ownerEmail: data.shop.ownerEmail || "",
      logoUrl: data.shop.logoUrl || null,
      defaultCountry: data.branches.find(b => b.isMainBranch)?.address?.country?.code || "IN",
      defaultCurrency: data.branches.find(b => b.isMainBranch)?.currency || "INR",
      defaultTaxSystem: data.branches.find(b => b.isMainBranch)?.taxProfile?.taxSystem || TAX_SYSTEMS.GST,
      // If data.plan is null, set subscriptionPlanId to null so UI knows no plan is active
      subscriptionPlanId: data.plan ? data.plan._id : null,
      planName: data.plan ? data.plan.name : "No Active Plan",
      planPriceLabel: data.plan ? (data.plan.currency === 'INR' ? '₹' : data.plan.currency) + " " + data.plan.pricing?.find(p => p.cycle === 'monthly')?.price + "/mo" : "Subscribe to use"
    };

    const branchData = data.branches.map(b => ({
      id: b._id,
      organizationId: b.shopId,
      name: b.name,
      address: {
        line1: b.address.line1,
        line2: b.address.line2,
        city: b.address.city,
        state: b.address.state.name,
        country: b.address.country.name,
        pincode: b.address.pincode
      },
      taxConfig: {
        taxSystem: b.taxProfile.taxSystem,
        gstin: b.taxProfile.registrationNumber,
        isGstRegistered: !!b.taxProfile.registrationNumber,
        allowInterState: b.taxProfile.isInterStateAllowed
      },
      currency: b.currency.code,
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
        priceLabel: `${p.currency === 'INR' ? '₹' : p.currency} ${monthlyPrice}/mo`,
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
      plans: availablePlans.length > 0 ? availablePlans : SUBSCRIPTION_PLANS
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
      }
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
  id: 1,
  businessName: "Food Plaza",
  ownerName: "",
  ownerEmail: "",
  defaultCountry: "IN",
  defaultCurrency: "INR",
  defaultTaxSystem: TAX_SYSTEMS.GST,
  subscriptionPlanId: "starter",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const initialBranches = [
  {
    id: 1,
    organizationId: 1,
    name: "Food Plaza - Trivandrum",
    address: {
      line1: "MG Road",
      city: "Trivandrum",
      state: "Kerala",
      country: "India",
      pincode: "695001",
    },
    taxConfig: {
      taxSystem: TAX_SYSTEMS.GST,
      gstin: "",
      isGstRegistered: false,
      allowInterState: true,
    },
    currency: "INR",
    isMainBranch: true,
    status: BRANCH_STATUS.ACTIVE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    organizationId: 1,
    name: "Food Plaza - Bangalore",
    address: {
      line1: "Indiranagar",
      city: "Bangalore",
      state: "Karnataka",
      country: "India",
      pincode: "560038",
    },
    taxConfig: {
      taxSystem: TAX_SYSTEMS.GST,
      gstin: "29ABCDE1234F1Z9",
      isGstRegistered: true,
      allowInterState: true,
    },
    currency: "INR",
    isMainBranch: false,
    status: BRANCH_STATUS.ACTIVE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
