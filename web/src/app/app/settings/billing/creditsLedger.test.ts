import { describe, expect, it } from "vitest";
import { describeRow, formatAmount } from "./CreditsCard";
import type { CreditTransaction } from "@/lib/api/models/app/subscription/Credits";

const row = (p: Partial<CreditTransaction>) => ({ amount: 0, reason: "", balance_after: 0, ...p }) as CreditTransaction;

describe("credit ledger rows", () => {
    it("shows a downgrade reset as the new balance, not a huge charge", () => {
        const r = row({ reason: "monthly_reset", amount: -99442, balance_after: 250 });
        expect(formatAmount(r)).toBe("= 250");
        expect(describeRow(r)).toContain("reset");
    });
    it("keeps signed amounts for charges", () => {
        expect(formatAmount(row({ reason: "agent_iteration", amount: -16 }))).toBe("-16");
        expect(formatAmount(row({ reason: "credit_topup", amount: 500 }))).toBe("+500");
    });
});
