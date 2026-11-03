import { describe, expect, it } from "vitest";
import { canWriteFirstEmail, freshMeta } from "./serverDraft";
import { heldSenders } from "./HeldSenders";
import type Sequence from "@/lib/api/models/app/campaigns/sequences/Sequence";
import type { CampaignEstimateResult } from "@/lib/api/client/app/campaigns/estimateCampaign";

const step = (p: Partial<Sequence>) => ({ id: "s", kind: "email", subject: "", body_html: "", body_plain: "", ...p }) as unknown as Sequence;

describe("canWriteFirstEmail", () => {
    it("is false for an unlocked flow", () => {
        expect(canWriteFirstEmail(freshMeta())).toBe(false);
    });
    it("lets a locked flow with only blank emails take the first email inline", () => {
        expect(canWriteFirstEmail({ ...freshMeta(), stepsLocked: true, steps: [step({}), step({ kind: "action" })] })).toBe(true);
        expect(canWriteFirstEmail({ ...freshMeta(), stepsLocked: true, steps: [step({ kind: "action" })] })).toBe(true);
    });
    it("keeps a locked flow with written emails read-only", () => {
        expect(canWriteFirstEmail({ ...freshMeta(), stepsLocked: true, steps: [step({ subject: "Hi" })] })).toBe(false);
    });
});

describe("heldSenders", () => {
    it("lists only resting senders", () => {
        const e = { senders: [{ id: "a", state: "resting" }, { id: "b", state: "ready" }] } as unknown as CampaignEstimateResult;
        expect(heldSenders(e).map((s) => s.id)).toEqual(["a"]);
        expect(heldSenders(undefined)).toEqual([]);
    });
});
