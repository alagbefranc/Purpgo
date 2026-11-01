// Modified by Purpgo LLC.
// Official Purpgo wordmark. The color file is the light-surface logo; the
// white file is the dark-surface logo.

export function Logo({ className = "" }: { className?: string }) {
    const match = className.match(/\b(?:size|h|w)-(\d+(?:\.\d+)?)\b/);
    const height = !match ? "h-6" : match[1] === "11" ? "h-8" : `h-${match[1]}`;
    const rest = className
        .replace(/\b(?:size|w|h)-[^\s]+/g, "")
        .replace(/(?:^|\s)(?:[\w-]+:)*text-[^\s]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    const cls = `${height} w-auto max-w-full ${rest}`.trim();
    return (
        <>
            <img src="/brand/purpgo-logo.svg" alt="Purpgo" className={`${cls} dark:hidden`} />
            <img src="/brand/purpgo-logo-white.svg" alt="" className={`${cls} hidden dark:block`} />
        </>
    );
}
