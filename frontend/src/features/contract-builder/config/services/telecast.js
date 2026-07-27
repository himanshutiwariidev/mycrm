import { FIELD_TYPES } from "../fieldDefinitions";

export const telecastConfig = {
  id: "telecast",
  label: "Telecast",
  icon: "Tv",
  description: "TV channel ad slots and campaign placements.",
  kind: "flat-list",
  items: [
    {
      id: "telecastCampaign",
      label: "Telecast Campaign",
      fields: [
        { name: "telecastChannel", type: FIELD_TYPES.TEXT, label: "Telecast Channel" },
        {
          name: "adFormat",
          type: FIELD_TYPES.SELECT,
          label: "Video Ad / L Band",
          options: [
            { value: "video-ad", label: "Video Ad" },
            { value: "l-band", label: "L Band" },
          ],
        },
        { name: "duration", type: FIELD_TYPES.TEXT, label: "Duration" },
        { name: "rodp", type: FIELD_TYPES.TEXT, label: "RODP" },
        { name: "primeTime", type: FIELD_TYPES.TOGGLE, label: "Prime Time" },
        { name: "location", type: FIELD_TYPES.TEXT, label: "Location" },
        { name: "budget", type: FIELD_TYPES.CURRENCY, label: "Budget" },
        { name: "campaignStartDate", type: FIELD_TYPES.DATE, label: "Campaign Start Date" },
        { name: "campaignEndDate", type: FIELD_TYPES.DATE, label: "Campaign End Date" },
        { name: "notes", type: FIELD_TYPES.TEXTAREA, label: "Notes" },
      ],
      commonFields: true,
      pricing: { basis: "flat", defaultUnitPrice: 100000 },
    },
  ],
};
