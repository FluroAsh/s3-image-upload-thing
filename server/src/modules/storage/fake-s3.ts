type SentCommand = {
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

type SendOptions = {
	/** Aborts the request when it fires; only on requests that set a deadline. */
	abortSignal?: AbortSignal;
};

type S3Response = {
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

type Respond = (sent: SentCommand, options?: SendOptions) => Promise<S3Response>;

const fakeS3 = () => {
	// s3-operations refuses to load without credentials.
	process.env.ACCESS_KEY_ID = "test-key-id";
	process.env.SECRET_ACCESS_KEY = "test-secret";

	const defaultRespond: Respond = async ({ input }) => ({ ETag: `"etag-of-${input.Key}"` });
	const state = {
		sent: [] as SentCommand[],
		options: [] as (SendOptions | undefined)[],
		defaultRespond,
		respond: defaultRespond,
	};

	const commandClass = (command: string) =>
		class {
			command = command;
			constructor(public input: SentCommand["input"]) {}
		};

	return Object.assign(state, {
		sdk: {
			GetObjectCommand: commandClass("GetObject"),
			ListObjectsV2Command: commandClass("ListObjectsV2"),
			PutObjectCommand: commandClass("PutObject"),
			S3Client: class {
				send = async ({ command, input }: SentCommand, options?: SendOptions) => {
					state.sent.push({ command, input });
					state.options.push(options);
					return state.respond({ command, input }, options);
				};
			},
		},
	});
};

/** Stands in for `@aws-sdk/client-s3`: pass `sdk` to `vi.mock`, read what was `sent`, and replace `respond` to script S3's answers. */
export const s3 = fakeS3();
