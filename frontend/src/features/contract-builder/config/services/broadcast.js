import { FIELD_TYPES } from "../fieldDefinitions";

export const broadcastConfig = {
  id: "broadcast",
  label: "Broadcast",
  icon: "Radio",
  description: "Radio station ad slots and campaign placements.",
  kind: "flat-list",
  items: [
    {
      id: "broadcastCampaign",
      label: "Broadcast Campaign",
      fields: [
        { name: "radioStation", type: FIELD_TYPES.TEXT, label: "Radio Station" },
        { name: "duration", type: FIELD_TYPES.TEXT, label: "Duration" },
        { name: "rodp", type: FIELD_TYPES.TEXT, label: "RODP" },
        { name: "primeTime", type: FIELD_TYPES.TOGGLE, label: "Prime Time" },
        { name: "location", type: FIELD_TYPES.TEXT, label: "Location" },
        { name: "budget", type: FIELD_TYPES.CURRENCY, label: "Budget" },
        { name: "frequency", type: FIELD_TYPES.TEXT, label: "Frequency" },
        { name: "notes", type: FIELD_TYPES.TEXTAREA, label: "Notes" },
      ],
      commonFields: true,
      pricing: { basis: "flat", defaultUnitPrice: 50000 },
    },
  ],
};
