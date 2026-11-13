export type HookResult = {
  /** ISO 8601 time the hook was called. */
  at: string;
  /** HTTP status the hook answered with; 0 when the call failed before an answer, such as a timeout. */
  status: number;
};

export type DeployHook = {
  id: string;
  name: string;
  /** Host and the last 4 characters only; the full URL never leaves the server. */
  maskedUrl: string;
  lastResult: HookResult | null;
};

export type HooksResponse = {
  hooks: DeployHook[];
  /** True while a deploy waits out the quiet period after the last write. */
  pending: boolean;
};

export type AddHookRequest = { name: string; url: string };

export type UpdateHookRequest = Partial<AddHookRequest>;

export type DeleteHookResponse = { id: string };

export type HookFired = { id: string; name: string; result: HookResult };

export type DeployResponse = { results: HookFired[] };
