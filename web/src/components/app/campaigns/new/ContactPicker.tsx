// Pick individual existing contacts for a new campaign, alongside lists.

import React from "react";
import { useQuery } from "@tanstack/react-query";
import searchContacts from "@/lib/api/client/app/contacts/searchContacts";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchInput } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export function ContactPicker({ picked, onChange }: { picked: string[]; onChange: (ids: string[]) => void }) {
    const [query, setQuery] = React.useState("");
    const [debounced, setDebounced] = React.useState("");
    React.useEffect(() => {
        const t = setTimeout(() => setDebounced(query.trim()), 250);
        return () => clearTimeout(t);
    }, [query]);
    const q = useQuery({
        queryKey: ["contacts", "campaign-picker", debounced],
        queryFn: () =>
            searchContacts(
                { query: debounced, custom_field_filters: [], campaign_ids: [], sort_by: "created_at", reverse: true },
                null,
                25,
            ),
    });
    const set = new Set(picked);
    const toggle = (id: string) => onChange(set.has(id) ? picked.filter((x) => x !== id) : [...picked, id]);
    const rows = q.data?.data ?? [];
    return (
        <div className="rounded-md border border-slate-200">
            <div className="p-2 border-b border-slate-100 flex items-center gap-2">
                <SearchInput value={query} onChange={setQuery} placeholder="Search contacts by name, email or company" className="flex-1" />
                {picked.length > 0 && <span className="text-[11.5px] text-slate-500 tabular-nums shrink-0">{picked.length} picked</span>}
            </div>
            <div className="max-h-56 overflow-y-auto divide-y divide-slate-50">
                {q.isPending ? (
                    <p className="px-3 py-3 text-[12px] text-slate-400">Loading contacts…</p>
                ) : rows.length === 0 ? (
                    <p className="px-3 py-3 text-[12px] text-slate-400">{debounced ? `No contact matches “${debounced}”.` : "No contacts yet."}</p>
                ) : (
                    rows.map((c) => {
                        const on = set.has(c.id);
                        const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
                        return (
                            <label key={c.id} className={cn("flex items-center gap-2.5 px-3 py-1.5 cursor-pointer text-[12px]", on ? "bg-sky-50/60" : "hover:bg-slate-50")}>
                                <Checkbox checked={on} onChange={() => toggle(c.id)} />
                                <span className="min-w-0 flex-1 truncate">
                                    <span className="text-slate-900">{name || c.email}</span>
                                    {name && <span className="text-slate-400"> · {c.email}</span>}
                                    {c.company && <span className="text-slate-400"> · {c.company}</span>}
                                </span>
                            </label>
                        );
                    })
                )}
            </div>
        </div>
    );
}
