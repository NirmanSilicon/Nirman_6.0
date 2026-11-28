export function isValidUPI(upiId) {
  if (typeof upiId !== "string") return false;

  const cleaned = upiId.trim();


  const upiRegex =
    /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,255}@[a-zA-Z0-9][a-zA-Z0-9.-]{0,63}$/;

  return upiRegex.test(cleaned);
}

export function parseUPI(qrText) {
  try {
    if (typeof qrText !== "string" || !qrText.trim()) {
      throw new Error("QR data is empty");
    }

    
    const url = new URL(qrText.trim());

    
    if (url.protocol !== "upi:" || (url.hostname !== "pay" && url.hostname !== "collect")) {
      throw new Error("Unsupported QR format");
    }

    const params = url.searchParams;

    const upiId = params.get("pa") || "";
    const receiverName = params.get("pn") || "";
    const amountText = params.get("am");
    const rawNote = params.get("tn") || ""; // Transaction note inside QR
    const mode = params.get("mode") || "";

    const amount = amountText ? Number(amountText) : null;

    if (!isValidUPI(upiId)) {
      throw new Error("Invalid UPI ID format");
    }

    if (amountText !== null && (!Number.isFinite(amount) || amount <= 0)) {
      throw new Error("Invalid payment amount");
    }

    
    const isCollectTrap = url.hostname === "collect" || mode === "02";
    const note = isCollectTrap
      ? `collect request ${rawNote}`.trim()
      : rawNote.trim();

    return {
      receiverName: receiverName.trim(),
      upiId: upiId.trim(),
      amount,
      note,
      isCollectTrap,
      valid: true
    };
  } catch (error) {
    return {
      receiverName: "",
      upiId: "",
      amount: null,
      note: "",
      isCollectTrap: false,
      valid: false,
      error: error.message
    };
  }
}