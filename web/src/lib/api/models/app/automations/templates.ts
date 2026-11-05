// Prebuilt automation starting points. Each is a full graph the "New automation"
// menu / empty state can instantiate. Native (Warmbly built-in) actions need no
// external connection — the user fills in the specifics (which tag, which
// pipeline) in the builder. A step that calls another product, such as Slack,
// is bound to the org's usable connection for that product at create time.

import type { AutomationGraph, AutomationNode } from "@/lib/api/models/app/automations/Automation";
import { PROVIDER_LABELS, type IntegrationProvider } from "@/lib/api/models/app/integrations/Integration";
import { actionNeedsChannel, isNativeAction } from "@/lib/api/models/app/automations/meta";

export interface AutomationTemplate {
    id: string;
    name: string;
    description: string;
    trigger_event: string;
    graph: AutomationGraph;
}

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
    {
        id: "tag-hot-replies",
        name: "Tag hot replies",
        description: "When a prospect replies positively, add a tag to the contact.",
        trigger_event: "campaign.reply_received",
        graph: {
            nodes: [
                { id: "trigger", type: "trigger", x: 0, y: 0 },
                { id: "c1", type: "condition", x: 0, y: 150, condition: { field: "field", key: "intent", operator: "equals", value: "positive" } },
                { id: "a1", type: "action", x: 0, y: 300, action: "warmbly.add_tag", config: {} },
            ],
            edges: [
                { id: "e1", source: "trigger", target: "c1", when: "" },
                { id: "e2", source: "c1", target: "a1", when: "true" },
            ],
        },
    },
    {
        id: "deal-on-meeting",
        name: "Deal on meeting booked",
        description: "When a meeting is booked, open a CRM deal for the contact.",
        trigger_event: "meeting.booked",
        graph: {
            nodes: [
                { id: "trigger", type: "trigger", x: 0, y: 0 },
                { id: "a1", type: "action", x: 0, y: 150, action: "warmbly.create_deal", config: { deal_name: "{{.invitee_name}} - {{.event_name}}" } },
            ],
            edges: [{ id: "e1", source: "trigger", target: "a1", when: "" }],
        },
    },
    {
        id: "unsubscribe-on-bounce",
        name: "Unsubscribe on bounce",
        description: "When an email hard-bounces, unsubscribe the contact to protect deliverability.",
        trigger_event: "campaign.email_bounced",
        graph: {
            nodes: [
                { id: "trigger", type: "trigger", x: 0, y: 0 },
                { id: "a1", type: "action", x: 0, y: 150, action: "warmbly.unsubscribe", config: {} },
            ],
            edges: [{ id: "e1", source: "trigger", target: "a1", when: "" }],
        },
    },
    {
        id: "slack-positive-reply",
        name: "Slack on positive reply",
        description: "Ping a Slack channel when a prospect replies positively.",
        trigger_event: "campaign.reply_received",
        graph: {
            nodes: [
                { id: "trigger", type: "trigger", x: 0, y: 0 },
                { id: "c1", type: "condition", x: 0, y: 150, condition: { field: "field", key: "intent", operator: "equals", value: "positive" } },
                { id: "a1", type: "action", x: 0, y: 300, action: "slack.notify", config: { message_template: "🔥 Positive reply from {{.contact_email}}" } },
            ],
            edges: [
                { id: "e1", source: "trigger", target: "c1", when: "" },
                { id: "e2", source: "c1", target: "a1", when: "true" },
            ],
        },
    },
];

// The provider an external action runs on. Native actions are not in here.
// webhook.ping is shared by several providers, so a template that uses it has
// to name the connection itself.
const ACTION_PROVIDER: Record<string, IntegrationProvider> = {
    "slack.notify": "slack",
    "discord.notify": "discord",
    "hubspot.upsert_contact": "hubspot",
    "pipedrive.upsert_person": "pipedrive",
    "salesforce.upsert_contact": "salesforce",
    "close.upsert_lead": "close",
    "clay.send_row": "clay",
};

// A connection the template binder can see. Matches the connections list.
export interface TemplateConnectionRef {
    id: string;
    provider: string;
    status: string;
    created_at?: string | Date;
    config_capabilities?: Record<string, unknown>;
    display_fields?: Record<string, unknown>;
}

export type TemplateBindResult =
    | { ok: true; graph: AutomationGraph }
    | { ok: false; provider: string; message: string };

export function providerForTemplateAction(action: string | undefined): IntegrationProvider | null {
    if (!action || isNativeAction(action)) return null;
    return ACTION_PROVIDER[action] ?? null;
}

// True when creating this graph needs a connection the template does not name.
export function templateNeedsProvider(graph: AutomationGraph): boolean {
    return graph.nodes.some((n) => n.type === "action" && !n.connection_id && !!providerForTemplateAction(n.action));
}

// A connected or degraded connection can run a step. Pending, authorizing,
// reauth-required, and disconnected cannot. Same rule as the backend's usable Slack.
function connectionIsUsable(status: string): boolean {
    return status === "connected" || status === "degraded";
}

function createdAtMs(c: TemplateConnectionRef): number {
    if (!c.created_at) return Number.POSITIVE_INFINITY;
    const t = c.created_at instanceof Date ? c.created_at.getTime() : Date.parse(c.created_at);
    return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

function stringField(bag: Record<string, unknown> | undefined, key: string): string {
    const v = bag?.[key];
    return typeof v === "string" ? v.trim() : "";
}

// The channel already saved on the connection (Slack settings, then display fields).
function connectionChannel(c: TemplateConnectionRef): string {
    return stringField(c.config_capabilities, "channel") || stringField(c.display_fields, "channel");
}

function providerLabel(provider: string): string {
    if (provider in PROVIDER_LABELS) return PROVIDER_LABELS[provider as IntegrationProvider];
    return provider;
}

// Oldest usable connection for a provider. Matches SlackConnection: one org
// often has a single Slack workspace, and the oldest connected (or degraded)
// one is the one the rest of the product treats as the org's connection.
function pickConnection(connections: TemplateConnectionRef[], provider: string): TemplateConnectionRef | null {
    const usable = connections
        .filter((c) => c.provider === provider && connectionIsUsable(c.status))
        .sort((a, b) => createdAtMs(a) - createdAtMs(b) || a.id.localeCompare(b.id));
    return usable[0] ?? null;
}

function withConnection(node: AutomationNode, conn: TemplateConnectionRef): AutomationNode {
    const config = { ...(node.config ?? {}) };
    if (actionNeedsChannel(node.action ?? "") && !String(config.channel ?? "").trim()) {
        const channel = connectionChannel(conn);
        if (channel) config.channel = channel;
    }
    return { ...node, connection_id: conn.id, config };
}

// bindTemplateConnections fills external action steps from the org's usable
// connections before the graph is posted. Native steps are left for the builder.
// When a required product is not connected, the caller should explain that
// instead of posting a graph the API will reject once the automation is on.
export function bindTemplateConnections(graph: AutomationGraph, connections: TemplateConnectionRef[]): TemplateBindResult {
    const picks = new Map<string, TemplateConnectionRef>();
    let missing: IntegrationProvider | null = null;
    let unknown = false;

    for (const n of graph.nodes) {
        if (n.type !== "action" || n.connection_id || isNativeAction(n.action ?? "")) continue;
        const provider = providerForTemplateAction(n.action);
        if (!provider) {
            unknown = true;
            continue;
        }
        if (picks.has(provider) || missing === provider) continue;
        const conn = pickConnection(connections, provider);
        if (!conn) missing = provider;
        else picks.set(provider, conn);
    }

    if (unknown) {
        return { ok: false, provider: "", message: "This template needs an integration selected before it can be created." };
    }
    if (missing) {
        const label = providerLabel(missing);
        return {
            ok: false,
            provider: missing,
            message: `Connect ${label} first. This template needs a ${label} connection before it can be created.`,
        };
    }
    if (picks.size === 0) return { ok: true, graph };

    return {
        ok: true,
        graph: {
            ...graph,
            nodes: graph.nodes.map((n) => {
                if (n.type !== "action" || n.connection_id) return n;
                const provider = providerForTemplateAction(n.action);
                const conn = provider ? picks.get(provider) : undefined;
                return conn ? withConnection(n, conn) : n;
            }),
        },
    };
}
