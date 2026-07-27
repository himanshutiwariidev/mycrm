export function slugify(label) {
  return String(label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function joinPath(...segments) {
  return segments.filter(Boolean).join(".");
}

export function splitPath(path) {
  return String(path).split(".");
}
