import { createLoader, parseAsString } from "nuqs/server";

export const dashboardSearchParams = {
	bucket: parseAsString.withDefault(""),
	region: parseAsString.withDefault(""),
};

/** Server-side loader for dashboard search params. */
export const loadDashboardParams = createLoader(dashboardSearchParams);
