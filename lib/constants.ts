export const NAV_SECTIONS = [
  {
    label: "Analytics",
    items: [{ label: "Post Event Analytics", href: "/analytics", icon: "chart" as const }],
  },
  {
    label: "Planning",
    items: [{ label: "Planning", href: "/planning", icon: "calendar" as const }],
  },
  {
    label: "Execution",
    items: [{ label: "In-Flight", href: "/execution", icon: "pulse" as const }],
  },
  {
    label: "Intelligence",
    items: [
      { label: "AI Advisor", href: "/intelligence/advisor", icon: "sparkles" as const },
      { label: "Smart Alerts", href: "/intelligence/alerts", icon: "alert" as const },
    ],
  },
];

export const OBJECTIVE_LABELS: Record<string, string> = {
  MAXIMISE_INCREMENTAL_JOINS: "Maximise incremental joins",
  FILL_OFF_PEAK_CAPACITY: "Fill off-peak capacity",
  IMPROVE_MEMBER_LIFETIME_CONTRIBUTION: "Improve member lifetime contribution",
  REACTIVATE_DORMANT_MEMBERS: "Reactivate dormant members",
  SUPPORT_NEW_OR_REFURBISHED_GYM: "Support a new or refurbished gym",
  DEFEND_SITE_AGAINST_COMPETITOR: "Defend a site against a competitor",
};

export const AUDIENCE_LABELS: Record<string, string> = {
  GENERAL: "General Public",
  STUDENT: "Students",
  CORPORATE: "Corporate / Hybrid Workers",
  HYBRID_WORKER: "Hybrid Workers",
  LAPSED_MEMBER: "Lapsed Members",
  ENGAGED_MEMBER: "Engaged Members",
};

export const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  RECOMMENDED: "Recommended",
  NEEDS_ATTENTION: "Needs Attention",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  ACTIVE: "Active",
  COMPLETED: "Completed",
};

export const MECHANICS_SEED = [
  {
    name: "£0 Joining Fee",
    howItWorks: "Waive joining fee",
    category: "ACQUISITION" as const,
    businessObjective: "Drive high volume acquisition",
  },
  {
    name: "First Month 50% Off",
    howItWorks: "Lower entry barrier",
    category: "ACQUISITION" as const,
    businessObjective: "Improve conversion",
  },
  {
    name: "Free First Week / Trial Pass",
    howItWorks: "Risk-free trial",
    category: "ACQUISITION" as const,
    businessObjective: "Acquire new prospects",
  },
  {
    name: "Student Membership Offer",
    howItWorks: "Discount around university intake",
    category: "ACQUISITION" as const,
    businessObjective: "Seasonal acquisition",
  },
  {
    name: "Corporate Membership Programme",
    howItWorks: "Employer-sponsored offer",
    category: "ACQUISITION" as const,
    businessObjective: "B2B2C growth",
  },
  {
    name: "Friend Referral Reward",
    howItWorks: "Existing members bring friends",
    category: "ACQUISITION" as const,
    businessObjective: "Low-CAC acquisition",
  },
  {
    name: "Off-Peak Membership",
    howItWorks: "Lower price for non-peak access",
    category: "UTILISATION" as const,
    businessObjective: "Fill unused capacity",
  },
  {
    name: "Daytime Access Pass",
    howItWorks: "Valid 9am-4pm only",
    category: "UTILISATION" as const,
    businessObjective: "Utilise daytime inventory",
  },
  {
    name: "Weekend Membership",
    howItWorks: "Weekend-only access",
    category: "UTILISATION" as const,
    businessObjective: "Balance utilisation",
  },
  {
    name: "Gym Upgrade Bundle",
    howItWorks: "Membership + PT/class/app benefits",
    category: "UTILISATION" as const,
    businessObjective: "Increase member value",
  },
];

// Single source of truth for which campaign objectives a mechanic can serve —
// used both to seed realistic campaigns and to keep the Analytics filter bar's
// Mechanic/Objective dropdowns scoped to the selected Acquisition/Utilisation
// category (rather than listing every mechanic under every category).
export const OBJECTIVES_FOR_MECHANIC: Record<string, string[]> = {
  "£0 Joining Fee": ["MAXIMISE_INCREMENTAL_JOINS", "DEFEND_SITE_AGAINST_COMPETITOR"],
  "First Month 50% Off": ["MAXIMISE_INCREMENTAL_JOINS"],
  "Free First Week / Trial Pass": ["MAXIMISE_INCREMENTAL_JOINS", "SUPPORT_NEW_OR_REFURBISHED_GYM"],
  "Student Membership Offer": ["MAXIMISE_INCREMENTAL_JOINS"],
  "Corporate Membership Programme": ["MAXIMISE_INCREMENTAL_JOINS", "IMPROVE_MEMBER_LIFETIME_CONTRIBUTION"],
  "Friend Referral Reward": ["IMPROVE_MEMBER_LIFETIME_CONTRIBUTION"],
  "Off-Peak Membership": ["FILL_OFF_PEAK_CAPACITY"],
  "Daytime Access Pass": ["FILL_OFF_PEAK_CAPACITY"],
  "Weekend Membership": ["FILL_OFF_PEAK_CAPACITY"],
  "Gym Upgrade Bundle": ["IMPROVE_MEMBER_LIFETIME_CONTRIBUTION", "REACTIVATE_DORMANT_MEMBERS"],
};

export const REGION_NAMES = ["London & South East", "Midlands", "North & Scotland"];

// Real The Gym Group UK site names (verified via web search), grouped into
// three reporting regions for this portfolio view. Catchment area and peak
// capacity are illustrative operating assumptions, not published figures.
export const CLUB_SEED = [
  { name: "Bexleyheath", region: "London & South East", catchmentArea: "South East London", peakCapacity: 420 },
  { name: "Ashford", region: "London & South East", catchmentArea: "Kent", peakCapacity: 340 },
  { name: "Basingstoke", region: "London & South East", catchmentArea: "Hampshire", peakCapacity: 360 },
  { name: "Birmingham Broad Street", region: "Midlands", catchmentArea: "Birmingham City Centre", peakCapacity: 480 },
  { name: "Birmingham Perry Barr", region: "Midlands", catchmentArea: "North Birmingham", peakCapacity: 380 },
  { name: "Bedford", region: "Midlands", catchmentArea: "Bedfordshire", peakCapacity: 300 },
  { name: "Altrincham", region: "North & Scotland", catchmentArea: "Greater Manchester", peakCapacity: 400 },
  { name: "Barnsley", region: "North & Scotland", catchmentArea: "South Yorkshire", peakCapacity: 340 },
  { name: "Ayr", region: "North & Scotland", catchmentArea: "South Ayrshire", peakCapacity: 300 },
];
