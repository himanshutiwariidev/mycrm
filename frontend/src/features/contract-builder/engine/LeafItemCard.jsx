import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useContractWizard } from "../context/useContractWizard";
import DynamicFieldRenderer from "./DynamicFieldRenderer";
import AdvancedFieldsPanel from "./AdvancedFieldsPanel";
import { ShareContentChecklist, LinkedContentBanner } from "./ContentSharingPanel";
import { getActiveLinkSource } from "../utils/contentSharing";

export default function LeafItemCard({ categoryId, path, leafConfig }) {
  const { state, dispatch, ACTIONS, isLeafEnabled, getLeafSelection, getSelectionsForCategory } = useContractWizard();
  const enabled = isLeafEnabled(categoryId, path);
  const selection = getLeafSelection(categoryId, path);
  const expanded = state.ui.expandedAdvancedPaths.includes(path);

  // Content sharing (e.g. Facebook posting the same content as Instagram):
  // while linked, the mirrored fields are read-only here and edited on the
  // source platform instead.
  const sharing = leafConfig.contentSharing;
  const linkSource = sharing ? getActiveLinkSource(getSelectionsForCategory(categoryId), selection) : null;
  const fields = (leafConfig.fields || []).map((f) =>
    linkSource && sharing.fields.includes(f.name) ? { ...f, readOnly: true } : f
  );

  const setEnabled = (next) =>
    dispatch({ type: ACTIONS.SET_LEAF_ENABLED, payload: { categoryId, path, enabled: next } });

  const setFieldValue = (fieldName, value) =>
    dispatch({ type: ACTIONS.SET_LEAF_FIELD_VALUE, payload: { categoryId, path, fieldName, value } });

  const setAdvancedValue = (fieldName, value) =>
    dispatch({ type: ACTIONS.SET_LEAF_ADVANCED_VALUE, payload: { categoryId, path, fieldName, value } });

  const toggleAdvanced = () => dispatch({ type: ACTIONS.TOGGLE_ADVANCED_PANEL, payload: { path } });

  return (
    <Card className={cn("transition-colors", enabled ? "border-primary/40" : "border-border")}>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 py-3.5">
        <div>
          <p className="text-sm font-medium leading-tight">{leafConfig.label}</p>
          {leafConfig.description && (
            <p className="text-xs text-muted-foreground">{leafConfig.description}</p>
          )}
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </CardHeader>
      <AnimatePresence initial={false}>
        {enabled && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <CardContent className="space-y-4 pt-0">
              <Separator />
              {linkSource && <LinkedContentBanner categoryId={categoryId} path={path} sourcePath={linkSource} />}
              <DynamicFieldRenderer
                fields={fields}
                values={selection?.values || {}}
                onChange={setFieldValue}
              />
              {sharing && !linkSource && <ShareContentChecklist categoryId={categoryId} path={path} />}
              {leafConfig.commonFields && (
                <AdvancedFieldsPanel
                  advanced={selection?.advanced || {}}
                  onChange={setAdvancedValue}
                  expanded={expanded}
                  onToggle={toggleAdvanced}
                  currency={state.pricingSummary.currency}
                />
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
