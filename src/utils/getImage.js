export const resolveItemTypeKeyword = (rawType) => {
  if (!rawType) return "";
  const t = String(rawType).trim();
  const upper = t.toUpperCase();
  if (upper === "MANUFACTURED") return "dish";
  if (upper === "STOCK") return "item";
  if (upper === "TRADE") return "product";
  if (upper === "RAW") return "ingredient";
  if (upper === "SERVICE") return "service";
  return t;
};

const IGNORED_CATEGORIES = new Set(["others", "general", "all", "none", "uncategorized", "default"]);

export const getBingImage = (nameOrItem, categoryOrOptions = {}, itemTypeOrOptions = {}, extraOptions = {}) => {
  let name = "";
  let category = "";
  let itemType = "";
  let opts = {};

  if (typeof nameOrItem === "object" && nameOrItem !== null) {
    const itm = nameOrItem;
    name = itm.name || itm.title || "";
    category = itm.categoryName || itm.category || (typeof itm.categoryId === "object" ? itm.categoryId?.name : "") || "";
    itemType = itm.itemType || itm.type || itm.productType || "";
    opts = typeof categoryOrOptions === "object" && categoryOrOptions !== null ? categoryOrOptions : {};
  } else {
    name = String(nameOrItem || "").trim();
    if (typeof categoryOrOptions === "object" && categoryOrOptions !== null) {
      opts = categoryOrOptions;
      category = opts.category || opts.categoryName || "";
      itemType = opts.itemType || opts.type || "";
    } else {
      category = String(categoryOrOptions || "").trim();
      if (typeof itemTypeOrOptions === "object" && itemTypeOrOptions !== null) {
        opts = itemTypeOrOptions;
        itemType = opts.itemType || opts.type || "";
      } else {
        itemType = String(itemTypeOrOptions || "").trim();
        opts = typeof extraOptions === "object" && extraOptions !== null ? extraOptions : {};
      }
    }
  }

  // Allow options to supply or override category / itemType
  if (opts.category && !category) category = opts.category;
  if (opts.itemType && !itemType) itemType = opts.itemType;

  const cleanName = String(name || "").trim();
  const cleanCat = String(category || "").trim();
  const cleanType = opts.literalItemType ? String(itemType || "").trim() : resolveItemTypeKeyword(itemType);

  // Build search query: name, category, item type, and png
  const queryParts = [];

  if (cleanName) {
    queryParts.push(cleanName);
  }

  if (
    cleanCat &&
    !IGNORED_CATEGORIES.has(cleanCat.toLowerCase()) &&
    !cleanName.toLowerCase().includes(cleanCat.toLowerCase())
  ) {
    queryParts.push(cleanCat);
  }

  if (
    cleanType &&
    !cleanName.toLowerCase().includes(cleanType.toLowerCase()) &&
    !cleanCat.toLowerCase().includes(cleanType.toLowerCase())
  ) {
    queryParts.push(cleanType);
  }

  // Always append 'png' for clean isolated/transparent visuals
  queryParts.push("png");

  const queryStr = queryParts.join(" ").trim() || "food dish png";
  const query = encodeURIComponent(queryStr);
  const w = opts.w || 120;
  const h = opts.h || 120;
  return `https://tse1.mm.bing.net/th?q=${query}&w=${w}&h=${h}&c=7&o=5&pid=1.7`;
};

export const DEFAULT_ITEM_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect width='100%25' height='100%25' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-family='Arial' font-size='12'%3ENo%20Image%3C/text%3E%3C/svg%3E";
