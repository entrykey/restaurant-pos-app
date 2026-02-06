/**
 * Organization & Branch data structures and initial state.
 * Tax & location rules belong to Branch; Organization holds default country, currency, tax system.
 */

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
