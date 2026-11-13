import { MAX_UPLOAD_REQUEST_BYTES } from "~/shared/constants/upload";
import type { UploadFileResult } from "~/shared/types";

import { limitConcurrency } from "./concurrency";
import { type ApiError, serverErrorMessage } from "./ofetch";

/** One S3 upload already saturates a ~50 Mbps home uplink (measured), so more in flight adds server memory, not speed. */
export const UPLOAD_CONCURRENCY = 3;

const TOO_LARGE = `larger than the ${MAX_UPLOAD_REQUEST_BYTES / 1024 / 1024} MB upload limit`;

/** Sends each file in its own request, so one oversized or failed file never sinks the rest of the batch. */
export const uploadEach = async (
	files: File[],
	post: (file: File) => Promise<UploadFileResult[]>,
	onSettled: () => void,
): Promise<UploadFileResult[]> => {
	const run = limitConcurrency(UPLOAD_CONCURRENCY);
	const seen = new Set<string>();

	const results = await Promise.all(
		files.map(async (file): Promise<UploadFileResult[]> => {
			try {
				/** The server only catches same-name races within one request, and each request now holds a single file. */
				if (seen.has(file.name))
					return [{ file: file.name, status: "refused", reason: "duplicate name in this upload" }];
				seen.add(file.name);
				/** Past the limit the server resets the connection mid-body, which the proxy can only report as a bare 500. */
				if (file.size > MAX_UPLOAD_REQUEST_BYTES) return [{ file: file.name, status: "refused", reason: TOO_LARGE }];
				return await run(() => post(file));
			} catch (error) {
				return [
					{
						file: file.name,
						status: "failed",
						reason: serverErrorMessage(error as ApiError, (error as Error).message),
					},
				];
			} finally {
				onSettled();
			}
		}),
	);
	return results.flat();
};
