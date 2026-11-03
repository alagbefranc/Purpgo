// Mailboxes in the sender pool that are held or resting, each with a one-click
// release, so a pool with no capacity can be fixed without leaving the review.

import React from "react";
import toast from "react-hot-toast/headless";
import { useQueryClient } from "@tanstack/react-query";
import { PauseIcon } from "@/components/icons";
import sendHold from "@/lib/api/client/app/emails/sendHold";
import type { CampaignEstimateResult } from "@/lib/api/client/app/campaigns/estimateCampaign";

export function heldSenders(e: CampaignEstimateResult | undefined) {
    return (e?.senders ?? []).filter((s) => s.state === "resting");
}

export function HeldSenders({ e }: { e: CampaignEstimateResult | undefined }) {
    const held = heldSenders(e);
    const qc = useQueryClient();
    const [busy, setBusy] = React.useState<string | null>(null);
    if (held.length === 0) return null;
    const release = async (id: string) => {
        setBusy(id);
        try {
            const state = await sendHold(id, false);
            toast.success(state.state === "active" ? "Hold removed. The mailbox can send this campaign." : "Hold removed, but the mailbox is still resting while its health recovers.");
            await Promise.all([
                qc.invalidateQueries({ queryKey: ["campaigns", "estimate"] }),
                qc.invalidateQueries({ queryKey: ["analytics", "accounts", id] }),
            ]);
        } catch {
            toast.error("Could not remove the hold. Try again from the mailbox's Overview.");
        } finally {
            setBusy(null);
        }
    };
    return (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2.5">
            <p className="text-[12.5px] font-medium text-amber-900 flex items-center gap-1.5">
                <PauseIcon className="w-3.5 h-3.5" />
                {held.length === 1 ? "1 mailbox is on hold" : `${held.length} mailboxes are on hold`}
            </p>
            <p className="text-[11.5px] text-amber-800 mt-0.5 leading-relaxed">
                A mailbox on hold (Reserve) or Resting is kept out of campaigns. Remove the hold to let it send this one; warmup is not affected.
            </p>
            <ul className="mt-2 space-y-1">
                {held.map((s) => (
                    <li key={s.id} className="flex items-center gap-2 text-[12px]">
                        <span className="min-w-0 flex-1 truncate text-slate-800">{s.email}</span>
                        <button
                            type="button"
                            onClick={() => void release(s.id)}
                            disabled={busy !== null}
                            className="h-6 px-2 rounded-md border border-amber-300 bg-white text-[11.5px] font-medium text-amber-900 hover:border-amber-400 disabled:opacity-50"
                        >
                            {busy === s.id ? "Removing…" : "Remove hold"}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
