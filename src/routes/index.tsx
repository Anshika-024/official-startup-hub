import { createFileRoute } from "@tanstack/react-router";
import App from "@/App";

const title = "GeM Pilot Portal — Government Procurement Dashboard";
const description =
  "Oversee pilot procurements, budget guardrails, CVC audit risk and vendor sandbox telemetry in one GovTech console.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: App,
});
