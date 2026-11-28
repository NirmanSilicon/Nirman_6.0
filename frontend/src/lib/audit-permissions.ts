export function canSubmitAudit(authorized: boolean, target: string, scanning: boolean): boolean {
  return authorized && target.trim().length > 0 && !scanning;
}
