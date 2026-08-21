import { tryCalculateBudgetSummary } from "./budget";
import {
  idecoContributionForMonth,
  nisaContributionForMonth,
} from "./investment-contributions";
import type { AppState, HouseholdMember } from "./state";

export type InvestmentFundingStatus =
  "available" | "unavailable" | "out-of-range";

export interface InvestmentFundingMemberContext {
  memberId: string;
  displayName: string;
  active: boolean;
  status: InvestmentFundingStatus;
  availableYen: number | null;
  nisaContributionYen: number | null;
  idecoContributionYen: number | null;
  totalContributionYen: number | null;
  remainingAfterInvestmentYen: number | null;
  oversubscribed: boolean | null;
  shortfallYen: number | null;
}

export interface InvestmentFundingContext {
  referenceMonth: string;
  status: InvestmentFundingStatus;
  members: InvestmentFundingMemberContext[];
  household: Omit<
    InvestmentFundingMemberContext,
    "memberId" | "displayName" | "active"
  >;
}

function checkedAdd(left: number, right: number): number {
  const value = BigInt(left) + BigInt(right);
  if (
    value < BigInt(Number.MIN_SAFE_INTEGER) ||
    value > BigInt(Number.MAX_SAFE_INTEGER)
  )
    throw new Error("investment funding amount exceeds the supported range");
  return Number(value);
}

function checkedSubtract(left: number, right: number): number {
  const value = BigInt(left) - BigInt(right);
  if (
    value < BigInt(Number.MIN_SAFE_INTEGER) ||
    value > BigInt(Number.MAX_SAFE_INTEGER)
  )
    throw new Error("investment funding amount exceeds the supported range");
  return Number(value);
}

function unavailableMember(
  member: Readonly<HouseholdMember>,
  availableYen: number | null,
): InvestmentFundingMemberContext {
  return {
    memberId: member.id,
    displayName: member.displayName,
    active: member.active,
    status: "unavailable",
    availableYen,
    nisaContributionYen: null,
    idecoContributionYen: null,
    totalContributionYen: null,
    remainingAfterInvestmentYen: null,
    oversubscribed: null,
    shortfallYen: null,
  };
}

function currentContribution(
  state: Readonly<AppState>,
  member: Readonly<HouseholdMember>,
  month: string,
): { nisa: number; ideco: number } | null {
  const nisaPlans = state.nisaPlans.filter(
    (plan) => plan.active && plan.memberId === member.id,
  );
  const idecoPlans = state.idecoPlans.filter(
    (plan) => plan.active && plan.memberId === member.id,
  );
  if (nisaPlans.length > 1 || idecoPlans.length > 1) return null;
  const nisa = nisaPlans[0]
    ? nisaContributionForMonth(nisaPlans[0], month).amountYen
    : 0;
  const ideco = idecoPlans[0]
    ? idecoContributionForMonth(idecoPlans[0], member, month).amountYen
    : 0;
  if (nisa === null || ideco === null) return null;
  return { nisa, ideco };
}

export function selectInvestmentFundingContext(
  state: Readonly<AppState>,
  referenceDate: string,
): InvestmentFundingContext {
  const date = /^(\d{4})-(0[1-9]|1[0-2])-\d{2}$/.exec(referenceDate);
  const referenceMonth = date ? `${date[1] ?? ""}-${date[2] ?? ""}` : "";
  const budgetResult = tryCalculateBudgetSummary(state, referenceDate);
  if (budgetResult.status === "out-of-range") {
    return {
      referenceMonth,
      status: "out-of-range",
      members: state.members.map((member) => ({
        ...unavailableMember(member, null),
        status: "out-of-range",
      })),
      household: {
        status: "out-of-range",
        availableYen: null,
        nisaContributionYen: null,
        idecoContributionYen: null,
        totalContributionYen: null,
        remainingAfterInvestmentYen: null,
        oversubscribed: null,
        shortfallYen: null,
      },
    };
  }
  const budget = budgetResult.summary;
  const budgetByMember = new Map([
    [budget.self.memberId, budget.self],
    [budget.partner.memberId, budget.partner],
  ]);
  const members = state.members.map(
    (member): InvestmentFundingMemberContext => {
      const available = budgetByMember.get(member.id)?.remainingYen ?? null;
      if (!member.active)
        return {
          memberId: member.id,
          displayName: member.displayName,
          active: false,
          status: "available",
          availableYen: 0,
          nisaContributionYen: 0,
          idecoContributionYen: 0,
          totalContributionYen: 0,
          remainingAfterInvestmentYen: 0,
          oversubscribed: false,
          shortfallYen: 0,
        };
      if (referenceMonth === "" || available === null)
        return unavailableMember(member, available);
      const contribution = currentContribution(state, member, referenceMonth);
      if (!contribution) return unavailableMember(member, available);
      try {
        const total = checkedAdd(contribution.nisa, contribution.ideco);
        const remaining = checkedSubtract(available, total);
        return {
          memberId: member.id,
          displayName: member.displayName,
          active: true,
          status: "available",
          availableYen: available,
          nisaContributionYen: contribution.nisa,
          idecoContributionYen: contribution.ideco,
          totalContributionYen: total,
          remainingAfterInvestmentYen: remaining,
          oversubscribed: remaining < 0,
          shortfallYen: remaining < 0 ? -remaining : 0,
        };
      } catch {
        return {
          ...unavailableMember(member, available),
          status: "out-of-range",
        };
      }
    },
  );

  const active = members.filter((member) => member.active);
  const unavailable = active.some((member) => member.status !== "available");
  let household: InvestmentFundingContext["household"];
  if (unavailable) {
    household = {
      status: active.some((member) => member.status === "out-of-range")
        ? "out-of-range"
        : "unavailable",
      availableYen: null,
      nisaContributionYen: null,
      idecoContributionYen: null,
      totalContributionYen: null,
      remainingAfterInvestmentYen: null,
      oversubscribed: null,
      shortfallYen: null,
    };
  } else {
    try {
      const sum = (
        key: "availableYen" | "nisaContributionYen" | "idecoContributionYen",
      ) =>
        active.reduce(
          (total, member) => checkedAdd(total, member[key] ?? 0),
          0,
        );
      const availableYen = sum("availableYen");
      const nisaContributionYen = sum("nisaContributionYen");
      const idecoContributionYen = sum("idecoContributionYen");
      const totalContributionYen = checkedAdd(
        nisaContributionYen,
        idecoContributionYen,
      );
      const remainingAfterInvestmentYen = checkedSubtract(
        availableYen,
        totalContributionYen,
      );
      household = {
        status: "available",
        availableYen,
        nisaContributionYen,
        idecoContributionYen,
        totalContributionYen,
        remainingAfterInvestmentYen,
        oversubscribed: remainingAfterInvestmentYen < 0,
        shortfallYen:
          remainingAfterInvestmentYen < 0 ? -remainingAfterInvestmentYen : 0,
      };
    } catch {
      household = {
        status: "out-of-range",
        availableYen: null,
        nisaContributionYen: null,
        idecoContributionYen: null,
        totalContributionYen: null,
        remainingAfterInvestmentYen: null,
        oversubscribed: null,
        shortfallYen: null,
      };
    }
  }
  return {
    referenceMonth,
    status: household.status,
    members,
    household,
  };
}
