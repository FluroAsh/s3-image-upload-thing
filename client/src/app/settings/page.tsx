import { redirect } from "next/navigation";

import { SettingsPage } from "@/components/settings";
import { loadDashboardParams } from "@/lib/search-params";

export const dynamic = "force-dynamic";

export default async function Page({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const { bucket, region } = await loadDashboardParams(searchParams);

	// The dashboard picks a valid bucket when the pair is missing
	if (!bucket || !region) redirect("/dashboard");

	return <SettingsPage />;
}
