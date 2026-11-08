import { createLoader, parseAsBoolean, parseAsString } from "nuqs/server";

export const dashboardSearchParams = {
	bucket: parseAsString.withDefault(""),
	region: parseAsString.withDefault(""),
	collections: parseAsBoolean.withDefault(false),
};

/** Server-side loader for dashboard search params. */
export const loadDashboardParams = createLoader(dashboardSearchParams);
