import { forwardRef, type SVGProps } from "react";
import type { LucideIcon } from "lucide-react";
type P = SVGProps<SVGSVGElement> & { size?: number | string; strokeWidth?: number | string; absoluteStrokeWidth?: boolean };
export function createCoreIcon(display: string, html: string): LucideIcon {
    const C = forwardRef<SVGSVGElement, P>(({ size = 24, strokeWidth, absoluteStrokeWidth, className, ...rest }, ref) => (
        <svg ref={ref} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={["coreui-icon", className].filter(Boolean).join(" ")} {...rest} dangerouslySetInnerHTML={{ __html: html }} />
    ));
    C.displayName = display;
    return C as unknown as LucideIcon;
}
