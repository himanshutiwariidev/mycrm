import { FIELD_TYPES } from "../fieldDefinitions";

export const celebrityManagementConfig = {
  id: "celebrityManagement",
  label: "Celebrity Enrollment / Management",
  icon: "Star",
  description: "Celebrity endorsements, exclusivity & usage rights.",
  kind: "flat-list",
  items: [
    {
      id: "celebrityEngagement",
      label: "Celebrity Engagement",
      fields: [
        { name: "celebrityName", type: FIELD_TYPES.TEXT, label: "Celebrity Name" },
        {
          name: "exclusivity",
          type: FIELD_TYPES.RADIO,
          label: "Exclusivity",
          options: [
            { value: "exclusive", label: "Exclusive" },
            { value: "non-exclusive", label: "Non Exclusive" },
          ],
        },
        {
          name: "requirements",
          type: FIELD_TYPES.MULTISELECT,
          label: "Requirements",
          options: [
            { value: "tv-advertisement", label: "TV Advertisement" },
            { value: "self-video", label: "Self Video" },
            { value: "old-photos", label: "Old Photos" },
            { value: "new-photos", label: "New Photos" },
            { value: "other", label: "Other" },
          ],
        },
        { name: "campaignDuration", type: FIELD_TYPES.TEXT, label: "Campaign Duration" },
        { name: "usageRights", type: FIELD_TYPES.TEXTAREA, label: "Usage Rights" },
        { name: "location", type: FIELD_TYPES.TEXT, label: "Location" },
        { name: "deliverables", type: FIELD_TYPES.TEXTAREA, label: "Deliverables" },
        { name: "notes", type: FIELD_TYPES.TEXTAREA, label: "Notes" },
      ],
      commonFields: true,
      pricing: { basis: "flat", defaultUnitPrice: 500000 },
    },
  ],
};
