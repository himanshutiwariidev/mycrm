/** Opens the visit check-in for a meeting (client + meeting prefilled). */
export function visitPathFor(meeting, base = "/sales?view=visits") {
  const qs = new URLSearchParams({ client: meeting.clientId?._id || meeting.clientId || "", meeting: meeting._id, purpose: meeting.description || "Client meeting" });
  return `${base}&${qs.toString()}`;
}
