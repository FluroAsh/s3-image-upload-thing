import { randomBytes } from "node:crypto";

import sharp from "sharp";

type JpegOptions = {
	/** Stored pixel width, before any EXIF rotation. */
	width: number;
	/** Stored pixel height, before any EXIF rotation. */
	height: number;
	/** EXIF orientation tag (1-8); omitted writes none. */
	orientation?: number;
	/** Fill with random pixels, so a WebP re-encode comes out larger than the JPEG. */
	noisy?: boolean;
};

/** Generates a JPEG for pipeline tests. */
export const makeJpeg = async ({ width, height, orientation, noisy }: JpegOptions): Promise<Buffer> => {
	const image = noisy
		? sharp(randomBytes(width * height * 3), { raw: { width, height, channels: 3 } }).jpeg({ quality: 40 })
		: sharp({ create: { width, height, channels: 3, background: "#c0ffee" } }).jpeg();
	return (orientation ? image.withMetadata({ orientation }) : image).toBuffer();
};

export type SentCommand = {
	/** Which SDK command was sent, e.g. `"PutObject"`. */
	command: string;
	/** The input the command was built with. */
	input: Record<string, unknown> & {
		/** Bucket key the command targets. */
		Key: string;
		/** Bytes or text to store; only on a put. */
		Body?: Buffer | string;
	};
};

export type S3Response = {
	/** ETag S3 returns for a stored object; only on a put. */
	ETag?: string;
	/** Objects found under a prefix; only on a listing. */
	Contents?: {
		/** Bucket key of the listed object. */
		Key: string;
	}[];
	/** Content of a fetched object; only on a get. */
	Body?: {
		/** The content decoded as text. */
		transformToString: () => Promise<string>;
		/** The content as raw bytes. */
		transformToByteArray: () => Promise<Uint8Array>;
	};
};

const fakeS3 = () => {
	// s3-operations refuses to load without credentials.
	process.env.ACCESS_KEY_ID = "test-key-id";
	process.env.SECRET_ACCESS_KEY = "test-secret";

	const defaultRespond = async ({ command, input }: SentCommand): Promise<S3Response> => {
		if (command === "HeadObject") throw Object.assign(new Error("Not Found"), { name: "NotFound" });
		return { ETag: `"etag-of-${input.Key}"` };
	};
	const state = { sent: [] as SentCommand[], defaultRespond, respond: defaultRespond };

	const commandClass = (command: string) =>
		class {
			command = command;
			constructor(public input: SentCommand["input"]) {}
		};

	return Object.assign(state, {
		sdk: {
			GetObjectCommand: commandClass("GetObject"),
			HeadObjectCommand: commandClass("HeadObject"),
			ListObjectsV2Command: commandClass("ListObjectsV2"),
			PutObjectCommand: commandClass("PutObject"),
			S3Client: class {
				send = async ({ command, input }: SentCommand) => {
					state.sent.push({ command, input });
					return state.respond({ command, input });
				};
			},
		},
	});
};

/** Stands in for `@aws-sdk/client-s3`: pass `sdk` to `vi.mock`, read what was `sent`, and replace `respond` to script S3's answers. */
export const s3 = fakeS3();
