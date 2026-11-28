import { describe, expect, it } from "vitest";

import { canSubmitAudit } from "@/lib/audit-permissions";

describe("audit authorization", () => {
  it("requires explicit authorization before starting a website audit", () => {
    expect(canSubmitAudit(false, "example.com", false)).toBe(false);
    expect(canSubmitAudit(true, "example.com", false)).toBe(true);
  });
});
