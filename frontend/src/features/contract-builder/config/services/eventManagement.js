import { FIELD_TYPES } from "../fieldDefinitions";

export const eventManagementConfig = {
  id: "eventManagement",
  label: "Event Management",
  icon: "CalendarDays",
  description: "End-to-end event planning, production and branding.",
  kind: "flat-list",
  items: [
    {
      id: "eventBrief",
      label: "Event Brief",
      fields: [
        { name: "eventType", type: FIELD_TYPES.TEXT, label: "Event Type" },
        { name: "venue", type: FIELD_TYPES.TEXT, label: "Venue" },
        { name: "city", type: FIELD_TYPES.TEXT, label: "City" },
        { name: "audienceSize", type: FIELD_TYPES.NUMBER, label: "Audience Size", min: 0 },
        { name: "eventDate", type: FIELD_TYPES.DATE, label: "Event Date" },
        { name: "duration", type: FIELD_TYPES.TEXT, label: "Duration" },
        { name: "celebrityRequired", type: FIELD_TYPES.TOGGLE, label: "Celebrity Required" },
        { name: "photography", type: FIELD_TYPES.TOGGLE, label: "Photography" },
        { name: "videography", type: FIELD_TYPES.TOGGLE, label: "Videography" },
        { name: "led", type: FIELD_TYPES.TOGGLE, label: "LED" },
        { name: "liveStreaming", type: FIELD_TYPES.TOGGLE, label: "Live Streaming" },
        { name: "branding", type: FIELD_TYPES.TOGGLE, label: "Branding" },
        { name: "stage", type: FIELD_TYPES.TOGGLE, label: "Stage" },
        { name: "sound", type: FIELD_TYPES.TOGGLE, label: "Sound" },
        { name: "notes", type: FIELD_TYPES.TEXTAREA, label: "Notes" },
      ],
      commonFields: true,
      pricing: { basis: "flat", defaultUnitPrice: 200000 },
    },
  ],
};
