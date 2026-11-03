import { describe, expect, it } from "vitest";
import { findBracketPlaceholders, placeholderWarning } from "./bracketPlaceholders";

describe("findBracketPlaceholders", () => {
    it("finds bracket placeholders across subject and body", () => {
        expect(findBracketPlaceholders("Hi [first name]", "Thanks,\n[your name]\n[your name]")).toEqual(["[first name]", "[your name]"]);
    });
    it("ignores merge tags, links, checkboxes and numbers", () => {
        expect(findBracketPlaceholders("Hi {{first_name}}, see [docs](https://x.y) [x] [ ] [1]")).toEqual([]);
    });
    it("looks through html", () => {
        expect(findBracketPlaceholders("<p>Best, <b>[Your Name]</b></p>")).toEqual(["[Your Name]"]);
    });
    it("summarises long lists", () => {
        expect(placeholderWarning(["[a1]", "[b2]", "[c3]", "[d4]"])).toContain("and 1 more");
    });
});
