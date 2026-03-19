export const getBingImage = (name, { w = 120, h = 120 } = {}) => {
  const query = encodeURIComponent(String(name || "").trim() || "food");
  return `https://tse1.mm.bing.net/th?q=${query}&w=${w}&h=${h}&c=7&o=5&pid=1.7`;
};

export const DEFAULT_ITEM_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect width='100%25' height='100%25' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-family='Arial' font-size='12'%3ENo%20Image%3C/text%3E%3C/svg%3E";

