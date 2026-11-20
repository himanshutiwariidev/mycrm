import { SERVICE_CONFIG } from "../config/services";
import { getLeafConfig, flattenCategoryLeaves } from "./configLookup";

/**
 * Content sharing lets one leaf (e.g. Instagram's content package) drive the
 * deliverables + quantities of sibling leaves in the same `contentSharing.group`
 * (e.g. Facebook, LinkedIn) — the same reels/posts cross-posted to several
 * platforms. A linked ("follower") selection stores `linkedFrom: <source path>`
 * and the reducer keeps its shared fields in sync with the source.
 */

/** Value names a leaf mirrors from its source when linked (empty if the leaf doesn't support sharing). */
export function getSharedFields(categoryId, path) {
  return getLeafConfig(categoryId, path)?.contentSharing?.fields || [];
}

/** Short platform name for a leaf, e.g. "Instagram" rather than "Instagram Content Package". */
export function getSharingLabel(categoryId, path) {
  const leaf = getLeafConfig(categoryId, path);
  return leaf?.contentSharing?.platformLabel || leaf?.label || path;
}

/** Other leaves in the same category + share group that `path` can push its content to. */
export function getShareTargets(categoryId, path) {
  const sharing = getLeafConfig(categoryId, path)?.contentSharing;
  if (!sharing) return [];
  return flattenCategoryLeaves(SERVICE_CONFIG[categoryId])
    .filter(({ path: p, leaf }) => p !== path && leaf.contentSharing?.group === sharing.group)
    .map(({ path: p, leaf }) => ({ path: p, label: leaf.contentSharing.platformLabel || leaf.label }));
}

/**
 * The source path a selection currently follows, or null. A `linkedFrom`
 * pointing at a source that is no longer selected is treated as unlinked, so
 * the platform never gets stuck read-only.
 */
export function getActiveLinkSource(selections = [], selection) {
  const source = selection?.linkedFrom;
  if (!source || source === selection.path) return null;
  return selections.some((s) => s.path === source) ? source : null;
}

export function pickSharedValues(values = {}, fields = []) {
  const picked = {};
  fields.forEach((name) => {
    if (values[name] !== undefined) picked[name] = values[name];
  });
  return picked;
}

function hasValue(v) {
  if (Array.isArray(v)) return v.length > 0;
  if (v && typeof v === "object") return Object.keys(v).length > 0;
  return v !== undefined && v !== null && v !== "";
}

/** Whether an unlinked selection already has its own content that linking would overwrite. */
export function hasOwnSharedContent(selection, fields = []) {
  return fields.some((name) => hasValue(selection?.values?.[name]));
}

/**
 * Folds every linked selection into its source's group, preserving order —
 * e.g. [Facebook, Instagram→Facebook, LinkedIn→Facebook, YouTube] becomes
 * [{ primary: Facebook, members: [Facebook, Instagram, LinkedIn] }, { primary: YouTube, members: [YouTube] }].
 * Used to show cross-posted platforms as one priced line instead of ₹X + ₹0 + ₹0.
 */
export function groupSharedSelections(selections = []) {
  const groups = [];
  const groupBySource = new Map();
  const followers = [];
  selections.forEach((sel) => {
    if (getActiveLinkSource(selections, sel)) {
      followers.push(sel);
      return;
    }
    const group = { primary: sel, members: [sel] };
    groupBySource.set(sel.path, group);
    groups.push(group);
  });
  followers.forEach((sel) => {
    const group = groupBySource.get(sel.linkedFrom);
    if (group) group.members.push(sel);
    else groups.push({ primary: sel, members: [sel] });
  });
  return groups;
}
