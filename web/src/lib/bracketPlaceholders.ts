// Finds unfilled bracket placeholders like "[your name]" or "[Company]" left
// in a template, so the user is warned before such text goes to a prospect.
// Merge tags use {{ }} and are not matched. Markdown links "[text](url)" and
// checkbox-style "[ ]"/"[x]" are ignored.
const PLACEHOLDER = /\[([^\[\]\n]{2,60})\](?!\()/g;

export function findBracketPlaceholders(...texts: (string | undefined | null)[]): string[] {
    const found = new Set<string>();
    for (const t of texts) {
        if (!t) continue;
        const plain = t.replace(/<[^>]*>/g, " ");
        for (const m of plain.matchAll(PLACEHOLDER)) {
            const inner = m[1].trim();
            if (!/[a-z]/i.test(inner)) continue;
            found.add(`[${inner}]`);
        }
    }
    return [...found];
}

export function placeholderWarning(found: string[]): string {
    const list = found.slice(0, 3).join(", ") + (found.length > 3 ? ` and ${found.length - 3} more` : "");
    return `This email still has placeholder text: ${list}. Replace it before sending.`;
}
