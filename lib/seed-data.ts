import bcrypt from "bcryptjs";

import { prisma } from "./prisma";
import { REGION_NAMES, CLUB_SEED, MECHANICS_SEED, OBJECTIVE_LABELS, OBJECTIVES_FOR_MECHANIC } from "./constants";
import { simulateCampaign, AVG_MONTHLY_FEE_GBP } from "./simulate/elasticity";
import { seededRandom, seededRange } from "./rand";

export const DEMO_PASSWORD = "GymGroup2026!";
export const DEMO_EMAIL = "sarah.johnson@gymgroup.co.uk";

function pick<T>(seed: string, arr: T[]): T {
  return arr[Math.floor(seededRandom(seed) * arr.length) % arr.length];
}

const AUDIENCE_FOR_MECHANIC: Record<string, string[]> = {
  "£0 Joining Fee": ["GENERAL"],
  "First Month 50% Off": ["GENERAL"],
  "Free First Week / Trial Pass": ["GENERAL"],
  "Student Membership Offer": ["STUDENT"],
  "Corporate Membership Programme": ["CORPORATE"],
  "Friend Referral Reward": ["ENGAGED_MEMBER"],
  "Off-Peak Membership": ["HYBRID_WORKER", "GENERAL"],
  "Daytime Access Pass": ["HYBRID_WORKER"],
  "Weekend Membership": ["GENERAL"],
  "Gym Upgrade Bundle": ["ENGAGED_MEMBER"],
};

function rationale(mechanicName: string, clubName: string, objective: string, roi: number) {
  const objectiveLabel = OBJECTIVE_LABELS[objective] ?? objective;
  if (roi >= 25) {
    return `${mechanicName} at ${clubName} is significantly outperforming plan, driving strong ${objectiveLabel.toLowerCase()}. Recommend scaling budget and extending to comparable clubs.`;
  }
  if (roi >= 8) {
    return `${mechanicName} at ${clubName} is on track for ${objectiveLabel.toLowerCase()} but ROI is middling — consider tightening incentive depth or narrowing audience before renewing.`;
  }
  return `${mechanicName} at ${clubName} is underperforming its ${objectiveLabel.toLowerCase()} target. Recommend pausing spend and re-testing at a lower incentive depth or a different mechanic.`;
}

// ---------------------------------------------------------------------------
// Capacity-gap-driven utilisation targeting
//
// Every club previously used the same utilisation curve shape (just jitter),
// so there was nothing genuinely club-specific for a utilisation campaign to
// target, and campaign club/mechanic/audience picks were fully random —
// disconnected from the actual heatmap a planner sees on the Analytics page.
// This gives each club a distinct profile (so the heatmap shows real,
// differentiated gaps), detects each club's weakest weekday daytime window,
// and drives UTILISATION-mechanic campaign generation from those real gaps —
// with the elasticity model's ROI computed against that exact window's
// utilisation, not a generic club-wide average.
// ---------------------------------------------------------------------------

type UtilProfile = "commuter" | "suburban" | "campus";
const UTIL_PROFILES: UtilProfile[] = ["commuter", "suburban", "campus"];

function profileMultiplier(profile: UtilProfile, dayOfWeek: number, hour: number, isWeekend: boolean): number {
  const isFriday = dayOfWeek === 5;
  if (profile === "commuter") {
    if (!isWeekend && hour >= 11 && hour <= 15) return 0.55; // deep weekday midday trough
    if (isWeekend) return 0.85;
    return 1;
  }
  if (profile === "campus") {
    if (!isWeekend && hour >= 10 && hour <= 16) return 1.3; // students fill the daytime
    if (isFriday && hour >= 17 && hour <= 20) return 0.65; // Friday evening empties out
    if (isWeekend) return 0.75;
    return 1;
  }
  // suburban: flatter all day, stronger weekends (family use), shallower midday dip
  if (!isWeekend && hour >= 11 && hour <= 15) return 0.82;
  if (isWeekend) return 1.15;
  return 1;
}

type CapacityGap = { hourStart: number; hourEnd: number; avgUtilPct: number; dayLabel: string };

function formatHourRange(hourStart: number, hourEndExclusive: number): string {
  const fmt = (h: number) => (h === 12 ? "12pm" : h > 12 ? `${h - 12}pm` : `${h}am`);
  return `${fmt(hourStart)}–${fmt(hourEndExclusive)}`;
}

function findWeekdayDaytimeGap(rows: { dayOfWeek: number; hour: number; utilisationPct: number }[]): CapacityGap | null {
  const weekdayDaytime = rows.filter((r) => r.dayOfWeek >= 1 && r.dayOfWeek <= 5 && r.hour >= 9 && r.hour <= 16);
  const byHour = new Map<number, number[]>();
  for (const r of weekdayDaytime) {
    const arr = byHour.get(r.hour) ?? [];
    arr.push(r.utilisationPct);
    byHour.set(r.hour, arr);
  }
  const hourAvgs = Array.from(byHour.entries())
    .map(([hour, vals]) => ({ hour, avg: vals.reduce((a, b) => a + b, 0) / vals.length }))
    .sort((a, b) => a.hour - b.hour);

  let best: { start: number; avg: number } | null = null;
  for (let start = 9; start <= 14; start++) {
    const window = hourAvgs.filter((h) => h.hour >= start && h.hour <= start + 2);
    if (window.length < 3) continue;
    const avg = window.reduce((s, h) => s + h.avg, 0) / window.length;
    if (!best || avg < best.avg) best = { start, avg };
  }
  if (!best) return null;
  return { hourStart: best.start, hourEnd: best.start + 3, avgUtilPct: Math.round(best.avg), dayLabel: "weekday" };
}

function cohortForGap(profile: UtilProfile): { audience: "STUDENT" | "HYBRID_WORKER" | "GENERAL"; persona: string } {
  if (profile === "campus") return { audience: "STUDENT", persona: "students between lectures" };
  if (profile === "commuter") return { audience: "HYBRID_WORKER", persona: "hybrid and remote workers on a midday break" };
  return { audience: "GENERAL", persona: "parents and flexible-schedule locals free during school hours" };
}

function gapRationale(mechanicName: string, clubName: string, gap: CapacityGap, persona: string, roi: number) {
  return `${clubName}'s ${gap.dayLabel} ${formatHourRange(gap.hourStart, gap.hourEnd)} window is running at ${gap.avgUtilPct}% utilisation — well below the 40% healthy threshold seen on the capacity heatmap. Targeting ${persona} with ${mechanicName} in this specific slot is projected to lift attendance and deliver ${roi}% ROI.`;
}

export async function seedDatabase(log: (msg: string) => void = console.log) {
  log("Seeding PromoIQ demo data…");

  // ---- User ----
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      name: "Sarah Johnson",
      role: "Sr. Portfolio Manager",
      initials: "SJ",
      passwordHash,
    },
  });

  // ---- Clear everything that depends on Region/Club before recreating them,
  // so a rename (e.g. old placeholder club names -> real site names) doesn't
  // leave orphaned rows behind. ----
  log("Clearing previous portfolio data…");
  await prisma.changeLogEntry.deleteMany({});
  await prisma.alert.deleteMany({});
  await prisma.externalSignal.deleteMany({});
  await prisma.memberEvent.deleteMany({});
  await prisma.campaign.deleteMany({});
  await prisma.clubUtilization.deleteMany({});
  await prisma.club.deleteMany({});
  await prisma.region.deleteMany({});

  // ---- Regions ----
  const regions = await Promise.all(REGION_NAMES.map((name) => prisma.region.create({ data: { name } })));
  const regionByName = new Map(regions.map((r) => [r.name, r]));

  // ---- Clubs ----
  const clubs = [];
  for (const c of CLUB_SEED) {
    const region = regionByName.get(c.region)!;
    const club = await prisma.club.create({
      data: {
        id: `${c.name}-seed`.replace(/\s+/g, "-").toLowerCase(),
        name: c.name,
        catchmentArea: c.catchmentArea,
        regionId: region.id,
        peakCapacity: c.peakCapacity,
      },
    });
    clubs.push(club);
  }

  // ---- Mechanics ----
  const mechanics = [];
  for (const m of MECHANICS_SEED) {
    const mechanic = await prisma.mechanic.upsert({
      where: { name: m.name },
      update: {},
      create: {
        name: m.name,
        howItWorks: m.howItWorks,
        category: m.category,
        businessObjective: m.businessObjective,
      },
    });
    mechanics.push(mechanic);
  }

  // ---- Club utilisation (day 0-6, hour 6-22) ----
  log("Seeding club utilisation…");
  const profileForClub = new Map<string, UtilProfile>();
  clubs.forEach((club, i) => profileForClub.set(club.id, UTIL_PROFILES[i % UTIL_PROFILES.length]));

  const utilRows: { clubId: string; dayOfWeek: number; hour: number; utilisationPct: number }[] = [];
  for (const club of clubs) {
    const profile = profileForClub.get(club.id)!;
    for (let day = 0; day <= 6; day++) {
      const isWeekend = day === 0 || day === 6;
      for (let hour = 6; hour <= 22; hour++) {
        let base: number;
        if (isWeekend) {
          base = 35 + 25 * Math.exp(-((hour - 11) ** 2) / 30);
        } else if (hour >= 17 && hour <= 20) {
          base = 78 + 15 * Math.exp(-((hour - 18) ** 2) / 3);
        } else if (hour >= 6 && hour <= 8) {
          base = 50 + 15 * Math.exp(-((hour - 7) ** 2) / 2);
        } else if (hour >= 12 && hour <= 13) {
          base = 45;
        } else {
          base = 22;
        }
        base *= profileMultiplier(profile, day, hour, isWeekend);
        const jitter = seededRange(`util-${club.id}-${day}-${hour}`, -6, 6);
        utilRows.push({ clubId: club.id, dayOfWeek: day, hour, utilisationPct: Math.max(4, Math.min(98, Math.round(base + jitter))) });
      }
    }
  }
  await prisma.clubUtilization.createMany({ data: utilRows });

  const clubUtilSummary = new Map<string, { peak: number; offPeak: number }>();
  const clubGaps = new Map<string, CapacityGap>();
  for (const club of clubs) {
    const rows = utilRows.filter((r) => r.clubId === club.id);
    const peakRows = rows.filter((r) => r.hour >= 17 && r.hour <= 20);
    const offPeakRows = rows.filter((r) => r.hour < 17 || r.hour > 20);
    clubUtilSummary.set(club.id, {
      peak: peakRows.reduce((s, r) => s + r.utilisationPct, 0) / peakRows.length,
      offPeak: offPeakRows.reduce((s, r) => s + r.utilisationPct, 0) / offPeakRows.length,
    });
    const gap = findWeekdayDaytimeGap(rows);
    if (gap) clubGaps.set(club.id, gap);
  }

  // ---- Portfolio monthly metrics (Jan 2025 - Aug 2026) ----
  log("Seeding portfolio monthly metrics…");
  await prisma.portfolioMonthlyMetric.deleteMany({});
  const months: Date[] = [];
  for (let y = 2025; y <= 2026; y++) {
    for (let m = 0; m < 12; m++) {
      const date = new Date(Date.UTC(y, m, 1));
      if (date > new Date("2026-08-01")) break;
      months.push(date);
    }
  }
  let cumulativeGrowth = 0;
  const monthlyMetrics = months.map((month, i) => {
    cumulativeGrowth += seededRange(`growth-${i}`, 0.5, 3.5);
    const investment = 280000 + cumulativeGrowth * 6500 + seededRange(`inv-${i}`, -15000, 15000);
    const roi = 18 + cumulativeGrowth * 0.55 + seededRange(`roi-${i}`, -3, 3);
    const joins = Math.round(investment * 0.026 + seededRange(`joins-${i}`, -80, 80));
    return {
      month,
      investment: Math.round(investment),
      incrementalRevenue: Math.round(investment * (1 + roi / 100)),
      joins: Math.max(0, joins),
      roi: Math.round(roi * 10) / 10,
    };
  });
  await prisma.portfolioMonthlyMetric.createMany({ data: monthlyMetrics });

  // ---- Campaigns ----
  log("Seeding campaigns…");

  const TODAY = new Date("2026-08-13");
  const dayMs = 24 * 60 * 60 * 1000;

  type PlannedCampaign = {
    status: "COMPLETED" | "ACTIVE" | "RECOMMENDED" | "NEEDS_ATTENTION" | "ACCEPTED" | "REJECTED";
    startDate: Date;
    // When set, this campaign MUST target this club's detected low-utilisation
    // window — not just opportunistically, but guaranteed, so every club with
    // a real gap has a live, actionable RECOMMENDED campaign closing it.
    forcedClubId?: string;
  };

  const gapClubsWorstFirst = clubs
    .filter((c) => clubGaps.has(c.id))
    .sort((a, b) => clubGaps.get(a.id)!.avgUtilPct - clubGaps.get(b.id)!.avgUtilPct);

  const plannedCampaigns: PlannedCampaign[] = [
    ...Array.from({ length: 15 }, (_, i) => ({
      status: "COMPLETED" as const,
      startDate: new Date(TODAY.getTime() - (30 + i * 34) * dayMs),
    })),
    ...Array.from({ length: 5 }, (_, i) => ({
      status: "ACTIVE" as const,
      startDate: new Date(TODAY.getTime() - (3 + i * 4) * dayMs),
    })),
    // One guaranteed off-peak recommendation per club with a detected gap —
    // this is what makes every low-utilisation window shown on the Analytics
    // heatmap traceable to a specific, actionable campaign in Planning.
    ...gapClubsWorstFirst.map((c, i) => ({
      status: "RECOMMENDED" as const,
      startDate: new Date(TODAY.getTime() + (7 + i * 5) * dayMs),
      forcedClubId: c.id,
    })),
    // A handful of general recommendations (acquisition, referral, etc.) so
    // Planning isn't 100% capacity-gap campaigns.
    ...Array.from({ length: 3 }, (_, i) => ({
      status: "RECOMMENDED" as const,
      startDate: new Date(TODAY.getTime() + (60 + i * 9) * dayMs),
    })),
    ...Array.from({ length: 4 }, (_, i) => ({
      status: "NEEDS_ATTENTION" as const,
      startDate: new Date(TODAY.getTime() + (10 + i * 8) * dayMs),
    })),
    ...Array.from({ length: 3 }, (_, i) => ({
      status: "ACCEPTED" as const,
      startDate: new Date(TODAY.getTime() + (5 + i * 6) * dayMs),
    })),
    ...Array.from({ length: 2 }, (_, i) => ({
      status: "REJECTED" as const,
      startDate: new Date(TODAY.getTime() - (60 + i * 40) * dayMs),
    })),
  ];

  // Outside the guaranteed slots above, utilisation-mechanic campaigns still
  // cycle through clubs by gap severity (worst first) rather than picking a
  // club at random, so even the historical/other-status campaigns are
  // grounded in a real measured gap where possible.
  let gapClubCursor = 0;

  const createdCampaigns = [];

  for (let i = 0; i < plannedCampaigns.length; i++) {
    const plan = plannedCampaigns[i];
    const seed = `campaign-${i}`;

    let club: (typeof clubs)[number];
    let mechanic: (typeof mechanics)[number];
    let audience: string;
    let gap: CapacityGap | null = null;
    let persona: string | null = null;

    if (plan.forcedClubId) {
      club = clubs.find((c) => c.id === plan.forcedClubId)!;
      gap = clubGaps.get(club.id)!;
      const utilisationMechanics = mechanics.filter((m) => m.category === "UTILISATION");
      mechanic = pick(`${seed}-mechanic`, utilisationMechanics.length > 0 ? utilisationMechanics : mechanics);
      const cohort = cohortForGap(profileForClub.get(club.id)!);
      audience = cohort.audience;
      persona = cohort.persona;

      // Bedford: a hand-specified worked example (steep daytime discount for
      // flexible-schedule locals — parents, retirees, carers — in the exact
      // weekday 9am-12pm window the heatmap flags), rather than the generic
      // profile-driven pick, so there's one concrete, fully-specified case in
      // the data alongside the general pattern.
      if (club.name === "Bedford") {
        mechanic = mechanics.find((m) => m.name === "Daytime Access Pass") ?? mechanic;
        audience = "GENERAL";
        persona = "stay-at-home parents, retirees, and other flexible-schedule locals";
      }
    } else {
      mechanic = pick(`${seed}-mechanic`, mechanics);
      club = pick(`${seed}-club`, clubs);
      audience = pick(`${seed}-audience`, AUDIENCE_FOR_MECHANIC[mechanic.name] ?? ["GENERAL"]);

      if (mechanic.category === "UTILISATION" && gapClubsWorstFirst.length > 0) {
        club = gapClubsWorstFirst[gapClubCursor % gapClubsWorstFirst.length];
        gapClubCursor += 1;
        gap = clubGaps.get(club.id)!;
        const cohort = cohortForGap(profileForClub.get(club.id)!);
        audience = cohort.audience;
        persona = cohort.persona;
      }
    }

    const objectiveOptions = OBJECTIVES_FOR_MECHANIC[mechanic.name] ?? ["MAXIMISE_INCREMENTAL_JOINS"];
    const objective = gap ? "FILL_OFF_PEAK_CAPACITY" : pick(`${seed}-objective`, objectiveOptions);

    const isBedfordExample = plan.forcedClubId !== undefined && club.name === "Bedford";
    const budget = isBedfordExample ? 12000 : Math.round(seededRange(`${seed}-budget`, 3000, 42000) / 500) * 500;
    // NEEDS_ATTENTION and REJECTED are allowed to land on weak parameter
    // combos (that's literally why they need review / got turned down).
    // Every other status — including RECOMMENDED — is an "AI recommendation"
    // and should never be seeded with a predictably negative ROI.
    const healthy = plan.status !== "NEEDS_ATTENTION" && plan.status !== "REJECTED";
    const incentiveDepthPct = isBedfordExample ? 50 : Math.round(seededRange(`${seed}-depth`, healthy ? 25 : 10, healthy ? 55 : 60));
    const durationWeeks = isBedfordExample ? 6 : Math.round(seededRange(`${seed}-duration`, healthy ? 4 : 2, 8));
    const offPeakOnly = gap !== null || (mechanic.category === "UTILISATION" && seededRandom(`${seed}-offpeak`) > 0.35);

    const util = clubUtilSummary.get(club.id)!;
    // When this campaign is targeting a detected gap, feed the elasticity
    // model that specific window's utilisation rather than the club's
    // broader off-peak average, so the predicted ROI is computed against
    // the exact number shown on the Analytics heatmap.
    const currentOffPeakUtilPct = gap ? gap.avgUtilPct : util.offPeak;
    const sim = simulateCampaign({
      mechanicCategory: mechanic.category,
      incentiveDepthPct,
      durationWeeks,
      budgetGbp: budget,
      offPeakOnly,
      club: { peakCapacity: club.peakCapacity, currentPeakUtilPct: util.peak, currentOffPeakUtilPct },
      guardrails: {},
    });

    const endDate = new Date(plan.startDate.getTime() + durationWeeks * 7 * dayMs);
    const confidence = Math.round(seededRange(`${seed}-conf`, 68, 94)) / 100;

    const isPast = plan.status === "COMPLETED" || plan.status === "ACTIVE";
    const noise = seededRange(`${seed}-noise`, 0.75, 1.2);

    const campaign = await prisma.campaign.create({
      data: {
        name: gap ? `${club.name} Weekday Daytime — ${mechanic.name}` : `${club.name} ${mechanic.name}`,
        objective: objective as never,
        status: plan.status,
        audienceType: audience as never,
        mechanicId: mechanic.id,
        clubId: club.id,
        regionId: club.regionId,
        startDate: plan.startDate,
        endDate,
        budget,
        incentiveValue: incentiveDepthPct,
        offPeakOnly,
        predictedJoins: sim.predictedJoins,
        predictedRoi: sim.predictedRoiPct,
        predictedRetention: sim.predictedRetentionPct,
        confidence,
        aiRationale:
          gap && persona
            ? gapRationale(mechanic.name, club.name, gap, persona, sim.predictedRoiPct)
            : rationale(mechanic.name, club.name, objective, sim.predictedRoiPct),
        minRoiGuardrail: plan.status === "NEEDS_ATTENTION" ? Math.round(seededRange(`${seed}-minroi`, 15, 30)) : null,
        maxPeakOccupancyGuardrail: plan.status === "NEEDS_ATTENTION" ? Math.round(seededRange(`${seed}-maxpeak`, 85, 95)) : null,
        actualJoins: isPast ? Math.round(sim.predictedJoins * noise) : null,
        actualRoi: isPast ? Math.round(sim.predictedRoiPct * noise * 10) / 10 : null,
        healthScore: isPast ? Math.max(15, Math.min(100, Math.round(60 + (noise - 1) * 120))) : null,
      },
    });
    createdCampaigns.push(campaign);
  }

  // ---- Member events (monthly, per club) ----
  log("Seeding member events…");
  const memberEventRows: {
    clubId: string;
    campaignId: string | null;
    type: "JOIN" | "CHURN" | "REACTIVATE";
    date: Date;
    isIncremental: boolean;
    revenueImpact: number;
  }[] = [];

  for (const club of clubs) {
    for (const month of months) {
      const seedKey = `${club.id}-${month.toISOString()}`;
      const joinCount = Math.round(seededRange(`${seedKey}-joins`, 8, 22));
      const churnCount = Math.round(seededRange(`${seedKey}-churn`, 3, 9));
      const reactivateCount = Math.round(seededRange(`${seedKey}-react`, 0, 3));

      const campaignForMonth = createdCampaigns.find(
        (c) => c.clubId === club.id && c.startDate <= month && c.endDate >= month && (c.status === "ACTIVE" || c.status === "COMPLETED"),
      );

      for (let j = 0; j < joinCount; j++) {
        const isIncremental = seededRandom(`${seedKey}-join-${j}`) > 0.32;
        memberEventRows.push({
          clubId: club.id,
          campaignId: campaignForMonth?.id ?? null,
          type: "JOIN",
          date: new Date(month.getTime() + seededRange(`${seedKey}-join-date-${j}`, 0, 27) * dayMs),
          isIncremental,
          revenueImpact: Math.round(AVG_MONTHLY_FEE_GBP * seededRange(`${seedKey}-join-rev-${j}`, 3, 9)),
        });
      }
      for (let c = 0; c < churnCount; c++) {
        memberEventRows.push({
          clubId: club.id,
          campaignId: null,
          type: "CHURN",
          date: new Date(month.getTime() + seededRange(`${seedKey}-churn-date-${c}`, 0, 27) * dayMs),
          isIncremental: false,
          revenueImpact: -Math.round(AVG_MONTHLY_FEE_GBP * 2),
        });
      }
      for (let r = 0; r < reactivateCount; r++) {
        memberEventRows.push({
          clubId: club.id,
          campaignId: campaignForMonth?.id ?? null,
          type: "REACTIVATE",
          date: new Date(month.getTime() + seededRange(`${seedKey}-react-date-${r}`, 0, 27) * dayMs),
          isIncremental: true,
          revenueImpact: Math.round(AVG_MONTHLY_FEE_GBP * 5),
        });
      }
    }
  }
  await prisma.memberEvent.createMany({ data: memberEventRows });

  // ---- External signals ----
  log("Seeding external signals…");
  await prisma.externalSignal.createMany({
    data: [
      { type: "COMPETITOR", description: "PureGym opened a new 24/7 site 1.2 miles from Gym Group Bexleyheath, offering £0 joining fee for the first month.", metadata: { club: "Bexleyheath" } },
      { type: "COMPETITOR", description: "Anytime Fitness cut its off-peak membership price by 15% across Midlands sites.", metadata: { region: "Midlands" } },
      { type: "WEATHER", description: "Met Office forecasts a wet, cold week across the North & Scotland region, typically increasing indoor fitness demand.", metadata: { region: "North & Scotland" } },
      { type: "HOLIDAY", description: "Birmingham City University's Perry Barr campus autumn term starts in 3 weeks — historically a strong window for student membership offers.", metadata: { club: "Birmingham Perry Barr" } },
      { type: "EVENT", description: "Birmingham city centre office occupancy is trending up 8% month-on-month as hybrid workers return more days.", metadata: { club: "Birmingham Broad Street" } },
      { type: "TREND", description: "Social search interest in \"off-peak gym membership\" is up 22% nationally over the last 30 days.", metadata: {} },
    ],
  });

  // ---- Alerts ----
  log("Seeding alerts…");
  const bexleyheath = clubs.find((c) => c.name === "Bexleyheath")!;
  const perryBarr = clubs.find((c) => c.name === "Birmingham Perry Barr")!;
  const altrincham = clubs.find((c) => c.name === "Altrincham")!;
  const ayr = clubs.find((c) => c.name === "Ayr")!;

  await prisma.alert.createMany({
    data: [
      {
        severity: "CRITICAL",
        category: "Competitor Threat",
        code: "A-2041",
        title: "PureGym opened a £0-joining-fee site 1.2 miles from Bexleyheath — no Gym Group counter-offer live",
        description: "Rival opened a 24/7 site within the Bexleyheath catchment offering a £0 joining fee for the first month. No defensive campaign is currently scheduled.",
        impactValue: 34000,
        impactLabel: "-£34K incremental revenue at risk over 3-week window",
        clubId: bexleyheath.id,
        regionId: bexleyheath.regionId,
      },
      {
        severity: "CRITICAL",
        category: "Over-Subsidisation Risk",
        code: "A-2038",
        title: "Birmingham Perry Barr Student Membership Offer is subsidising 38% of baseline joins",
        description: "The discount depth on the current student offer is deep enough that a large share of joins would likely have happened anyway at full price.",
        impactValue: 18600,
        impactLabel: "-£18.6K wasted spend (rolling 4 weeks)",
        clubId: perryBarr.id,
        regionId: perryBarr.regionId,
      },
      {
        severity: "WARNING",
        category: "Capacity Risk",
        code: "A-2035",
        title: "Altrincham evening peak utilisation is forecast to exceed 96% next week",
        description: "Current acquisition campaigns at Altrincham are on track to push 6-8pm utilisation past safe capacity, risking member experience complaints.",
        impactValue: 0,
        impactLabel: "Congestion risk — no defensive action scheduled",
        clubId: altrincham.id,
        regionId: altrincham.regionId,
      },
      {
        severity: "WARNING",
        category: "Underperformance",
        code: "A-2031",
        title: "Ayr Off-Peak Membership uptake is 22% behind plan",
        description: "Daytime pass uptake at Ayr has consistently missed the weekly plan for the last 3 weeks.",
        impactValue: 7400,
        impactLabel: "-£7.4K vs plan (rolling 3 weeks)",
        clubId: ayr.id,
        regionId: ayr.regionId,
      },
      {
        severity: "WARNING",
        category: "Calendar Gap",
        code: "A-2029",
        title: "No reactivation campaign scheduled ahead of January lapse spike",
        description: "Historical member data shows a lapse spike in the 6 weeks after New Year. No reactivation offer is currently planned for that window.",
        impactValue: 0,
        impactLabel: "Unscheduled opportunity",
      },
      {
        severity: "INSIGHT",
        category: "Trend",
        code: "A-2024",
        title: "Off-peak membership search interest up 22% nationally",
        description: "Rising search interest suggests headroom to expand off-peak and daytime pass campaigns beyond current scope.",
        impactValue: 0,
        impactLabel: "Growth opportunity",
      },
    ],
  });

  // ---- Change log ----
  log("Seeding change log…");
  await prisma.changeLogEntry.createMany({
    data: [
      {
        type: "COMPETITOR_OPENING",
        entityRef: "PureGym — Bexleyheath",
        summary: "New 24/7 PureGym site opened 1.2 miles from Gym Group Bexleyheath with an introductory £0 joining fee.",
        before: { site: "none" },
        after: { site: "PureGym Bexleyheath", joiningFee: "£0 (first month)" },
      },
      {
        type: "COMPETITOR_PRICE",
        entityRef: "Anytime Fitness — Midlands",
        summary: "Anytime Fitness reduced off-peak membership pricing across its Midlands estate.",
        before: { offPeakPrice: "£19.99/mo" },
        after: { offPeakPrice: "£16.99/mo" },
      },
      {
        type: "COMPETITOR_OFFER",
        entityRef: "F45 Training — Altrincham",
        summary: "F45 launched a free-first-week trial pass targeted at hybrid workers in Altrincham town centre.",
        before: { trialOffer: "none" },
        after: { trialOffer: "Free first week" },
      },
      {
        type: "INTERNAL_CAMPAIGN_EDIT",
        entityRef: "Birmingham Perry Barr Student Membership Offer",
        summary: "Incentive depth increased ahead of university intake after AI flagged early softness in sign-ups.",
        before: { incentiveDepth: "25%" },
        after: { incentiveDepth: "35%" },
      },
    ],
  });

  log("Seed complete.");
  return { email: user.email, password: DEMO_PASSWORD, campaigns: createdCampaigns.length, clubs: clubs.length };
}
