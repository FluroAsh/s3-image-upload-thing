import { describe, expect, it } from "vitest";

import { errorMessage } from "./helpers";

describe("errorMessage", () => {
	it("returns an Error's message", () => {
		expect(errorMessage(new Error("Access Denied"))).toBe("Access Denied");
	});

	it("stringifies anything else, or uses the fallback when given one", () => {
		expect(errorMessage("boom")).toBe("boom");
		expect(errorMessage(undefined, "Failed to get bucket")).toBe("Failed to get bucket");
	});
});
