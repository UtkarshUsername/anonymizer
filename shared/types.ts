export type Platform = "reddit";

export interface Item {
  platform: Platform;
  id: string;
  kind: "comment" | "post";
  context: string;
  title?: string;
  body: string;
  createdUtc: number;
  permalink: string;
}

export interface Profile {
  platform: Platform;
  username: string;
  profileUrl: string;
  items: Item[];
  firstUtc?: number;
  lastUtc?: number;
}

export interface IdentityProof {
  exactUser: string;
  rationale: string;
  publicProofUrls: string[];
}

export interface Finding {
  category:
    | "location"
    | "employer_or_school"
    | "real_name"
    | "age_or_dob"
    | "gender"
    | "relationships_or_family"
    | "financial"
    | "health"
    | "schedule_or_routine"
    | "cross_platform_handle"
    | "external_link"
    | "writing_fingerprint"
    | "other";
  claim: string;
  confidence: "low" | "medium" | "high";
  rationale: string;
  evidence: Array<{ quote: string; permalink: string }>;
  remediation: string;
}

export interface AuditResult {
  username: string;
  platform: Platform;
  itemCount: number;
  span?: { firstUtc: number; lastUtc: number };
  overallRisk: "low" | "medium" | "high";
  summary: string;
  identity: IdentityProof;
  findings: Finding[];
  directIdentifiers?: {
    emails: string[];
    socialHandles: Array<{
      platform: string;
      handle: string;
      url: string;
    }>;
  };
}
