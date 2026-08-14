export class GitHubApiError extends Error {
  constructor(status, message) {
    super(`GitHub API ${String(status)}: ${message}`);
    this.status = status;
  }
}

export class GitHubDistributionApi {
  constructor({ token, fetchImpl = globalThis.fetch }) {
    if (!token) throw new Error("GITHUB_TOKEN is required");
    this.token = token;
    this.fetchImpl = fetchImpl;
  }

  async request(method, url, body) {
    const response = await this.fetchImpl(url, {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "personal-finance-planner-distribution",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) {
      let message = response.statusText;
      try {
        message = (await response.json()).message ?? message;
      } catch {
        // Preserve the HTTP status when GitHub returns no JSON body.
      }
      throw new GitHubApiError(response.status, message);
    }
    if (response.status === 204) return null;
    return response.json();
  }

  get(url) {
    return this.request("GET", url);
  }

  post(url, body) {
    return this.request("POST", url, body);
  }

  patch(url, body) {
    return this.request("PATCH", url, body);
  }
}

export async function optionalGet(api, url, absentStatuses = [404]) {
  try {
    return await api.get(url);
  } catch (error) {
    if (
      error instanceof GitHubApiError &&
      absentStatuses.includes(error.status)
    )
      return null;
    throw error;
  }
}
