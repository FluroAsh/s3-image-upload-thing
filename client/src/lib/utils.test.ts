import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
	it("keeps a custom font size next to a colour", () => {
		expect(cn("text-caption text-fg-1")).toBe("text-caption text-fg-1");
		expect(cn("text-body text-fg", "text-secondary")).toBe("text-fg text-secondary");
	});
});
