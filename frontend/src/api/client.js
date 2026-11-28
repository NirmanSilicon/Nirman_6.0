
/**
 * Typed REST client wrapping all 9 AlarmSense FastAPI v1 endpoints.
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "")
  .replace(/\/+$/, "");

const REQUEST_TIMEOUT = 30000;

export class ApiError extends Error {
  constructor(message, status, detail = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function requestJson(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const isFormData = options.body instanceof FormData;

  const headers = isFormData
    ? { ...(options.headers || {}) }
    : {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      };

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT
  );

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });

    const text = await response.text();

    let data = null;

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { detail: text };
      }
    }

    if (!response.ok) {
      const detail =
        typeof data?.detail === "string"
          ? data.detail
          : Array.isArray(data?.detail)
            ? data.detail
                .map((item) => item.msg || JSON.stringify(item))
                .join("; ")
            : `Request failed with status ${response.status}`;

      throw new ApiError(
        detail,
        response.status,
        data?.detail ?? null
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error.name === "AbortError") {
      throw new Error("Request timed out or was cancelled.");
    }

    throw new Error(
      error.message || "Unable to connect to AlarmSense backend."
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/** 1. GET /api/v1/health */
export function getHealth() {
  return requestJson("/api/v1/health", {
    method: "GET",
  });
}

/** 2. GET /api/v1/faults */
export function getFaults() {
  return requestJson("/api/v1/faults", {
    method: "GET",
  });
}

/** 3. POST /api/v1/simulate/{fault_id} */
export function simulateFault(faultId, params = {}) {
  const body = {
    step_index: params.step_index ?? 0,
    window_size: params.window_size ?? 20,
    episode_index: params.episode_index ?? 0,
    pre_fault_steps: params.pre_fault_steps ?? 20,
    smooth_steps: params.smooth_steps ?? 1,
  };

  return requestJson(
    `/api/v1/simulate/${encodeURIComponent(faultId)}`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}

/** 4. POST /api/v1/analyze */
export function analyzeWindow(windowRows) {
  return requestJson("/api/v1/analyze", {
    method: "POST",
    body: JSON.stringify({
      window: windowRows,
    }),
  });
}

/** 5. POST /api/v1/feedback */
export function submitFeedback(payload) {
  return requestJson("/api/v1/feedback", {
    method: "POST",
    body: JSON.stringify({
      fault_id: payload.fault_id,
      episode_id: payload.episode_id ?? null,
      step_index: payload.step_index ?? null,
      action: payload.action,
      corrected_fault_id: payload.corrected_fault_id ?? null,
      notes: payload.notes || null,
    }),
  });
}

/** 6. GET /api/v1/feedback/summary */
export function getFeedbackSummary() {
  return requestJson("/api/v1/feedback/summary", {
    method: "GET",
  });
}

/** 7. GET /api/v1/plants */
export function getPlants() {
  return requestJson("/api/v1/plants", {
    method: "GET",
  });
}

/** 8. POST /api/v1/plants/retrain */
export function retrainPlant(formValues) {
  const formData = new FormData();

  formData.append("file", formValues.file);
  formData.append("plant_id", formValues.plant_id);

  if (formValues.plant_name) {
    formData.append("plant_name", formValues.plant_name);
  }

  formData.append(
    "status_col",
    formValues.status_col ?? formValues.label_col ?? "STATUS"
  );

  if (formValues.timestamp_col) {
    formData.append("timestamp_col", formValues.timestamp_col);
  }

  formData.append(
    "normal_label",
    String(formValues.normal_label ?? 0)
  );

  formData.append(
    "window_size",
    String(formValues.window_size ?? 20)
  );

  formData.append(
    "activate",
    String(
      formValues.activate ??
      formValues.activate_immediately ??
      true
    )
  );

  return requestJson("/api/v1/plants/retrain", {
    method: "POST",
    body: formData,
  });
}

/** 9. POST /api/v1/plants/{plant_id}/activate */
export function activatePlant(plantId) {
  return requestJson(
    `/api/v1/plants/${encodeURIComponent(plantId)}/activate`,
    {
      method: "POST",
    }
  );
}

