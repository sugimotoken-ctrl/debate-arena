import type { SourceModule, OpportunityStatus } from "@/lib/radar/types";

export const MODULE_META: Record<
  SourceModule,
  { label: string; badgeBg: string; badgeText: string; scoreBg: string; scoreText: string }
> = {
  pain_point: { label: "Pain point", badgeBg: "#FAECE7", badgeText: "#993C1D", scoreBg: "#FAECE7", scoreText: "#993C1D" },
  trend: { label: "Trend", badgeBg: "#E1F5EE", badgeText: "#0F6E56", scoreBg: "#E1F5EE", scoreText: "#0F6E56" },
  regulation: { label: "Regulation", badgeBg: "#E6F1FB", badgeText: "#185FA5", scoreBg: "#E6F1FB", scoreText: "#185FA5" },
  guided: { label: "Radar", badgeBg: "#EEEDFE", badgeText: "#3C3489", scoreBg: "#EEEDFE", scoreText: "#3C3489" },
};

export const STATUS_META: Record<OpportunityStatus, { label: string; bg: string; text: string }> = {
  new: { label: "New", bg: "#F1EFE8", text: "#5F5E5A" },
  interesting: { label: "Interesting", bg: "#EAF3DE", text: "#3B6D11" },
  researching: { label: "Researching", bg: "#E6F1FB", text: "#185FA5" },
  rejected: { label: "Rejected", bg: "#FCEBEB", text: "#A32D2D" },
};
