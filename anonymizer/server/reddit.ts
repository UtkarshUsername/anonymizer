// Reddit OAuth and data fetching — same Arctic Shift API as the deanonymizer

import type { Item, Profile } from "../shared/types";

const BASE = "https://arctic-shift.photon-reddit.com/api";
const PAGE = 100;
const USER_AGENT = "deanonymizer/0.1 (privacy self-audit)";

interface RawComment {
  id: string;
  body: string;
  subreddit: string;
  created_utc: number;
  permalink: string;
  link_title?: string;
}

interface RawPost {
  id: string;
  title: string;
  selftext?: string;
  subreddit: string;
  created_utc: number;
  permalink: string;
  url?: string;
}

async function fetchPage<T>(
  endpoint: string,
  author: string,
  before?: number,
): Promise<T[]> {
  const url = new URL(`${BASE}/${endpoint}/search`);
  url.searchParams.set("author", author);
  url.searchParams.set("limit", String(PAGE));
  url.searchParams.set("sort", "desc");
  if (before) url.searchParams.set("before", String(before));

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (res.status === 404) return [];
  if (!res.ok) {
    throw new Error(`Arctic Shift ${endpoint} ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as { data?: T[] };
  return json.data ?? [];
}

async function fetchAll<T extends { created_utc: number }>(
  endpoint: string,
  author: string,
  max: number,
): Promise<T[]> {
  const out: T[] = [];
  let before: number | undefined;
  while (out.length < max) {
    const page = await fetchPage<T>(endpoint, author, before);
    if (page.length === 0) break;
    out.push(...page);
    const oldest = page[page.length - 1].created_utc;
    if (before !== undefined && oldest >= before) break;
    before = oldest;
    if (page.length < PAGE) break;
  }
  return out.slice(0, max);
}

export async function fetchRedditProfile(username: string, max: number): Promise<Profile> {
  const user = username.replace(/^\/?u\//i, "").trim();

  const [comments, posts] = await Promise.all([
    fetchAll<RawComment>("comments", user, max),
    fetchAll<RawPost>("posts", user, Math.ceil(max / 4)),
  ]);

  const items: Item[] = [];

  for (const c of comments) {
    if (!c.body || c.body === "[deleted]" || c.body === "[removed]") continue;
    items.push({
      platform: "reddit",
      id: c.id,
      kind: "comment",
      context: `r/${c.subreddit}`,
      title: c.link_title,
      body: c.body,
      createdUtc: c.created_utc,
      permalink: `https://reddit.com${c.permalink}`,
    });
  }

  for (const p of posts) {
    const body = [p.title, p.selftext, p.url].filter(Boolean).join("\n");
    if (!body.trim()) continue;
    items.push({
      platform: "reddit",
      id: p.id,
      kind: "post",
      context: `r/${p.subreddit}`,
      title: p.title,
      body,
      createdUtc: p.created_utc,
      permalink: `https://reddit.com${p.permalink}`,
    });
  }

  items.sort((a, b) => b.createdUtc - a.createdUtc);
  return {
    platform: "reddit",
    username: user,
    profileUrl: `https://www.reddit.com/user/${encodeURIComponent(user)}`,
    items,
    firstUtc: items.length ? items[items.length - 1].createdUtc : undefined,
    lastUtc: items.length ? items[0].createdUtc : undefined,
  };
}

// Reddit OAuth helpers

export function getRedditAuthUrl(state: string, redirectUri: string, clientId: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    state,
    redirect_uri: redirectUri,
    duration: "permanent",
    scope: "identity",
  });
  return `https://www.reddit.com/api/v1/authorize?${params}`;
}

export async function exchangeRedditCode(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`Reddit token exchange failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? "",
    expiresIn: data.expires_in,
  };
}

export async function verifyRedditIdentity(
  accessToken: string,
): Promise<{ name: string }> {
  const res = await fetch("https://oauth.reddit.com/api/v1/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": USER_AGENT,
    },
  });

  if (!res.ok) {
    throw new Error(`Reddit identity check failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { name: string };
  return { name: data.name };
}
