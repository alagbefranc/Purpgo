import { describe, expect, it } from "vitest";
import {
    AUTOMATION_TEMPLATES,
    bindTemplateConnections,
    templateNeedsProvider,
    type TemplateConnectionRef,
} from "./templates";

const template = (id: string) => {
    const found = AUTOMATION_TEMPLATES.find((t) => t.id === id);
    if (!found) throw new Error(`missing template ${id}`);
    return found;
};

const conn = (partial: TemplateConnectionRef): TemplateConnectionRef => partial;

const slackNode = (graph: { nodes: { id: string; connection_id?: string; config?: Record<string, unknown> }[] }) => {
    const node = graph.nodes.find((n) => n.id === "a1");
    if (!node) throw new Error("missing slack step");
    return node;
};

describe("automation templates", () => {
    it("only Slack on positive reply calls an external product", () => {
        for (const t of AUTOMATION_TEMPLATES) {
            expect(templateNeedsProvider(t.graph)).toBe(t.id === "slack-positive-reply");
        }
        const deal = template("deal-on-meeting");
        expect(deal.graph.nodes.map((n) => n.action).filter(Boolean)).toEqual(["warmbly.create_deal"]);
    });
});

describe("bindTemplateConnections", () => {
    const slack = template("slack-positive-reply");

    it("leaves native templates unchanged", () => {
        for (const id of ["tag-hot-replies", "deal-on-meeting", "unsubscribe-on-bounce"]) {
            const t = template(id);
            const bound = bindTemplateConnections(t.graph, []);
            expect(bound).toEqual({ ok: true, graph: t.graph });
        }
    });

    it("attaches the oldest usable Slack connection and keeps the message", () => {
        const bound = bindTemplateConnections(slack.graph, [
            conn({ id: "new", provider: "slack", status: "connected", created_at: "2026-06-02T00:00:00Z" }),
            conn({
                id: "old",
                provider: "slack",
                status: "degraded",
                created_at: "2026-01-01T00:00:00Z",
                config_capabilities: { channel: "#sales" },
            }),
            conn({ id: "pending", provider: "slack", status: "pending", created_at: "2025-01-01T00:00:00Z" }),
            conn({ id: "hubspot", provider: "hubspot", status: "connected", created_at: "2020-01-01T00:00:00Z" }),
        ]);
        expect(bound.ok).toBe(true);
        if (!bound.ok) return;
        const step = slackNode(bound.graph);
        expect(step.connection_id).toBe("old");
        expect(step.config).toMatchObject({
            channel: "#sales",
            message_template: "🔥 Positive reply from {{.contact_email}}",
        });
    });

    it("uses the connection display channel when settings have none", () => {
        const bound = bindTemplateConnections(slack.graph, [
            conn({ id: "s", provider: "slack", status: "connected", display_fields: { channel: "#wins" } }),
        ]);
        expect(bound.ok).toBe(true);
        if (!bound.ok) return;
        expect(slackNode(bound.graph).config?.channel).toBe("#wins");
    });

    it("refuses to create when Slack is not usable yet", () => {
        for (const status of ["pending", "authorizing", "reauth_required", "disconnected"]) {
            const bound = bindTemplateConnections(slack.graph, [conn({ id: "s", provider: "slack", status })]);
            expect(bound).toEqual({
                ok: false,
                provider: "slack",
                message: "Connect Slack first. This template needs a Slack connection before it can be created.",
            });
        }
        expect(bindTemplateConnections(slack.graph, []).ok).toBe(false);
    });

    it("does not post a shared webhook action that has no connection", () => {
        const bound = bindTemplateConnections(
            {
                nodes: [
                    { id: "trigger", type: "trigger", x: 0, y: 0 },
                    { id: "a1", type: "action", x: 0, y: 150, action: "webhook.ping", config: { url: "https://example.com" } },
                ],
                edges: [{ id: "e1", source: "trigger", target: "a1", when: "" }],
            },
            [conn({ id: "z", provider: "zapier", status: "connected" })],
        );
        expect(bound.ok).toBe(false);
        if (bound.ok) return;
        expect(bound.message).toMatch(/integration selected/);
    });
});
