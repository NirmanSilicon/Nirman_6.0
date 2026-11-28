
export const defaultPermissions = {
  "SupportBot-01": {
    read: true,
    write: false,
    finance: false,
    employee: false,
    export: false,
  },
  "FinanceAgent-X": {
    read: true,
    write: true,
    finance: true,
    employee: false,
    export: false,
  },
  "HR-Assistant": {
    read: true,
    write: false,
    finance: false,
    employee: true,
    export: false,
  },
  "General-Assistant": {
  read: false,
  write: false,
  finance: false,
  employee: false,
  export: false,
},
  "DevOps-Agent": {
    read: true,
    write: true,
    finance: false,
    employee: false,
    export: false,
  },
};
function isNormalPrompt(action) {
  const text = action.toLowerCase().trim();

  const safePatterns = [
    /\bmerge sort\b/,
    /\bquick sort\b/,
    /\bbinary search\b/,
    /\bbubble sort\b/,
    /\bweather\b/,
    /\btemperature\b/,
    /\bwrite (a )?(code|program)\b/,
    /\bexplain\b/,
    /\bwhat is\b/,
    /\bwhat('s|s) the\b/,
    /\bdefine\b/,
    /\bsolve\b/,
    /\bcalculate\b/,
    /\bhello\b/,
    /\bhi\b/
  ];

  return safePatterns.some(pattern =>
    pattern.test(text)
  );
}
export function detectAgent(action) {
  const text = action.toLowerCase().trim();

  if (/\b(employee|employees|salary|salaries|payroll|hr|attendance|recruitment|leave policy)\b/.test(text)) {
    return "HR-Assistant";
  }

  if (/\b(payment|refund|invoice|billing|money|transfer|transaction|bank)\b/.test(text) || /\$\s*\d/.test(text)) {
    return "FinanceAgent-X";
  }

  if (/\b(server|database|deploy|deployment|production|infrastructure|docker|kubernetes)\b/.test(text)) {
    return "DevOps-Agent";
  }

  if (/\b(customer|faq|return policy|order|complaint|support|delivery)\b/.test(text)) {
    return "SupportBot-01";
  }

  return "General-Assistant";
}
export function analyzePrompt(
  agent,
  action,
  permissions = defaultPermissions
) {
  const text = action.toLowerCase().trim();
  const access = permissions[agent] || {};
  const factors = [];

  const addRisk = (name, points) => {
    factors.push({ name, points });
  };

  // Prompt injection detection
  const injection =
    /ignore.*instruction|override|bypass|jailbreak|system prompt|forget.*rules|developer mode|disable.*security|act as admin/i.test(text);

  // Sensitive information detection
  const sensitive =
    /password|ssn|social security|salary|salaries|api key|secret|credit card|access token|confidential/i.test(text);

  // External data transfer detection
  const external =
    /external email|external server|public link|upload.*external|leak/i.test(text);

  // Destructive action detection
  const destructive =
    /delete.*all|drop.*database|wipe|destroy|format.*disk/i.test(text);

  // Financial operation detection
  const financial =
    /refund|transfer|payment|withdraw|transaction|purchase/i.test(text);

  const employee =
    /employee|personnel|payroll|staff records/i.test(text);

  const exporting =
    /export|download.*records|send.*data|upload/i.test(text);

  const writing =
    /delete|modify|update|create|issue|change|remove|edit|send/i.test(text);

  const reading =
    /^(fetch|read|view|search|get|show|list|what|explain|summarize)\b/i.test(text);

  // RBAC permission verification
  const violation =
    !permissions[agent] ||
    (financial && !access.finance) ||
    (employee && !access.employee) ||
    (exporting && !access.export) ||
    (writing && !access.write) ||
    (reading && !access.read);

  // Calculate individual risk factors
  if (injection)
    addRisk("Prompt injection detected", 95);

  if (violation)
    addRisk("RBAC permission violation", 90);

  if (sensitive)
    addRisk("Sensitive data exposure", 90);

  if (external)
    addRisk("External data destination", 25);

  if (destructive)
    addRisk("Destructive operation", 95);

  if (financial)
    addRisk("Financial operation", 65);

  if (writing)
    addRisk("State-changing action", 10);

  if (exporting)
    addRisk("Data export operation", 20);

  if (factors.length === 0 && isNormalPrompt(action)) {
    addRisk("Safe informational request", 5);
  } 
  else if (!reading && factors.length === 0) {
    addRisk("Unrecognized intent", 60);
  }
  if (factors.length === 0) {
    addRisk("Baseline request risk", 10);
  }

  // Calculate final risk score
  const score = Math.min(
    100,
    factors.reduce((sum, item) => sum + item.points, 0)
  );

  let decision = "ALLOWED";
  let reason = "Low-risk authorized request";
  let mitigation = "Proceed with normal monitoring";

  // Final security policy decision
  if (
    injection ||
    violation ||
    sensitive ||
    destructive ||
    external ||
    score >= 90
  ) {
    decision = "BLOCKED";
    reason = factors.map(f => f.name).join(", ");
    mitigation = "Deny execution and notify administrator";
  } else if (score >= 50 || writing || exporting) {
    decision = "NEEDS HUMAN REVIEW";
    reason = factors.map(f => f.name).join(", ");
    mitigation = "Require human authorization before execution";
  }

  // Calculate potential financial exposure
  const amounts = [
    ...action.matchAll(/\$\s*([\d,]+(?:\.\d{1,2})?)/g)
  ];

  const financialExposure = amounts.reduce(
    (sum, match) =>
      sum + Number(match[1].replace(/,/g, "")),
    0
  );

  return {
    score,
    decision,
    reason,
    mitigation,
    factors,
    injection,
    violation,
    financialExposure,
  };
}
