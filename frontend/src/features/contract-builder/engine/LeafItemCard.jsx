import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useContractWizard } from "../context/useContractWizard";
import DynamicFieldRenderer from "./DynamicFieldRenderer";
import AdvancedFieldsPanel from "./AdvancedFieldsPanel";

export default function LeafItemCard({ categoryId, path, leafConfig }) {
  const { state, dispatch, ACTIONS, isLeafEnabled, getLeafSelection } = useContractWizard();
  const enabled = isLeafEnabled(categoryId, path);
  const selection = getLeafSelection(categoryId, path);
  const expanded = state.ui.expandedAdvancedPaths.includes(path);

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
              <DynamicFieldRenderer
                fields={leafConfig.fields || []}
                values={selection?.values || {}}
                onChange={setFieldValue}
              />
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
