export const getBingImage = (name, categoryOrOptions = {}, options = {}) => {
  let category = "";
  let opts = {};

  if (typeof categoryOrOptions === "string") {
    category = categoryOrOptions;
    opts = options || {};
  } else if (typeof categoryOrOptions === "object" && categoryOrOptions !== null) {
    opts = categoryOrOptions;
    category = opts.category || "";
  }

  const cleanName = String(name || "").trim();
  const cleanCat = String(category || "").trim();

  let queryStr = cleanName;
  if (cleanCat && !cleanName.toLowerCase().includes(cleanCat.toLowerCase())) {
    queryStr = `${cleanName} - ${cleanCat}`;
  } else if (!cleanName) {
    queryStr = cleanCat || "food";
  }

  const query = encodeURIComponent(queryStr);
  const w = opts.w || 120;
  const h = opts.h || 120;
  return `https://tse1.mm.bing.net/th?q=${query}&w=${w}&h=${h}&c=7&o=5&pid=1.7`;
};

export const DEFAULT_ITEM_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect width='100%25' height='100%25' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-family='Arial' font-size='12'%3ENo%20Image%3C/text%3E%3C/svg%3E";


