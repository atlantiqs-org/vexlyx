const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface ApiError {
  error: string;
  code: string;
  details: Record<string, unknown>;
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export async function fetchAPI<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const response = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorData: ApiError;
    try {
      errorData = (await response.json()) as ApiError;
    } catch {
      throw new ApiRequestError(
        "An unexpected error occurred",
        "UNKNOWN_ERROR",
        response.status,
      );
    }
    throw new ApiRequestError(
      errorData.error,
      errorData.code,
      response.status,
      errorData.details,
    );
  }

  return response.json() as Promise<T>;
}
