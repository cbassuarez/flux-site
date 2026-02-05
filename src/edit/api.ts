export type EditState = {
  title?: string;
  path?: string;
  diagnostics?: unknown;
  capabilities?: Record<string, unknown>;
  previewPath?: string;
  outline?: unknown;
  [key: string]: unknown;
};

export type TransformRequest = {
  op: string;
  args: Record<string, unknown>;
};

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {})
    }
  });
  const body = await parseBody(response);
  if (!response.ok) {
    const message =
      (typeof body === "object" && body && "message" in body && typeof (body as any).message === "string"
        ? (body as any).message
        : typeof body === "string" && body
          ? body
          : `Request failed (${response.status})`);
    throw new ApiError(response.status, message, body);
  }
  return body as T;
}

export async function fetchEditState(): Promise<EditState> {
  return fetchJson<EditState>("/api/edit/state");
}

export async function fetchEditOutline(): Promise<unknown | null> {
  try {
    return await fetchJson<unknown>("/api/edit/outline");
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function postTransform(request: TransformRequest): Promise<unknown> {
  return fetchJson<unknown>("/api/edit/transform", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(request)
  });
}
