import React from "react";
import { Link2, Link2Off } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useContractWizard } from "../context/useContractWizard";
import {
  getShareTargets,
  getSharingLabel,
  getSharedFields,
  getActiveLinkSource,
  hasOwnSharedContent,
} from "../utils/contentSharing";

/**
 * Shown on a platform that is NOT itself linked (e.g. Instagram): a checklist
 * of sibling platforms (Facebook, LinkedIn, ...) that should post the exact
 * same deliverables + quantities. Ticking one enables that platform and keeps
 * it in sync with this one; unticking removes that platform again.
 */
export function ShareContentChecklist({ categoryId, path }) {
  const { state, dispatch, ACTIONS, getSelectionsForCategory } = useContractWizard();
  const targets = getShareTargets(categoryId, path);
  if (!targets.length) return null;

  const selections = getSelectionsForCategory(categoryId);
  const byPath = new Map(selections.map((s) => [s.path, s]));
  const sourceLabel = getSharingLabel(categoryId, path);
  const sharedFields = getSharedFields(categoryId, path);
  const followerPaths = new Set(
    selections.filter((s) => getActiveLinkSource(selections, s)).map((s) => s.linkedFrom)
  );

  const setShared = (target, checked) => {
    if (checked) {
      const existing = byPath.get(target.path);
      if (
        existing &&
        !getActiveLinkSource(selections, existing) &&
        hasOwnSharedContent(existing, sharedFields) &&
        !window.confirm(`${target.label} already has its own deliverables. Replace them with ${sourceLabel}'s?`)
      ) {
        return;
      }
      dispatch({ type: ACTIONS.LINK_LEAF, payload: { categoryId, sourcePath: path, targetPath: target.path } });
    } else {
      dispatch({ type: ACTIONS.SET_LEAF_ENABLED, payload: { categoryId, path: target.path, enabled: false } });
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-input p-3">
      <div>
        <p className="flex items-center gap-1.5 text-xs font-medium">
          <Link2 className="h-3.5 w-3.5" />
          Post the same content on
        </p>
        <p className="text-xs text-muted-foreground">
          Ticked platforms get the same deliverables and quantities as {sourceLabel} and stay in sync as you edit here.
        </p>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {targets.map((target) => {
          const sel = byPath.get(target.path);
          const linkSource = getActiveLinkSource(selections, sel);
          const checked = linkSource === path;
          let blockedReason = null;
          if (!checked && linkSource) blockedReason = `same as ${getSharingLabel(categoryId, linkSource)}`;
          else if (!checked && followerPaths.has(target.path)) blockedReason = "shares its own content";
          const id = `share-${path}-${target.path}`.replace(/\./g, "-");

          return (
            <label
              key={target.path}
              htmlFor={id}
              className={cn(
                "flex items-center gap-2 text-sm",
                blockedReason ? "cursor-not-allowed text-muted-foreground" : "cursor-pointer"
              )}
              title={blockedReason ? `${target.label} is ${blockedReason} — change it on the ${target.label} tab` : undefined}
            >
              <Checkbox
                id={id}
                checked={checked}
                disabled={!!blockedReason || state.status.isSubmitting}
                onCheckedChange={(next) => setShared(target, next === true)}
              />
              {target.label}
              {blockedReason && <span className="text-xs">({blockedReason})</span>}
            </label>
          );
        })}
      </div>
    </div>
  );
}

/** Shown on a platform that mirrors another one (e.g. Facebook following Instagram). */
export function LinkedContentBanner({ categoryId, path, sourcePath }) {
  const { dispatch, ACTIONS } = useContractWizard();
  const sourceLabel = getSharingLabel(categoryId, sourcePath);

  const unlink = () => dispatch({ type: ACTIONS.UNLINK_LEAF, payload: { categoryId, path } });

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-1.5 text-xs">
        <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        <span>
          Same content as <span className="font-medium">{sourceLabel}</span>. Deliverables and quantities are synced
          from the {sourceLabel} tab.
        </span>
      </p>
      <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={unlink}>
        <Link2Off />
        Edit separately
      </Button>
    </div>
  );
}
