import { redirect } from "next/navigation";

import { SettingsPage } from "@/components/settings";
import { redirectToValidBucket } from "@/lib/initial-query-state";
import { loadDashboardParams } from "@/lib/search-params";
import { getBuckets } from "@/services/s3";

export const dynamic = "force-dynamic";

/** Corrects a missing or unknown bucket in place; the dashboard owns the unreachable and no-bucket states. */
export default async function Page({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const { bucket, region } = await loadDashboardParams(searchParams);
	const data = await getBuckets().catch(() => null);

	if (!data?.buckets.length) redirect("/dashboard");
	redirectToValidBucket(data, bucket, region, "/settings");

	return <SettingsPage />;
}
