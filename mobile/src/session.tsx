import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { DocumentPickerAsset } from "expo-document-picker";
import {
  Analysis,
  Connection,
  DEFAULT_URL,
  request,
  validConnection,
} from "./api";

export type User = {
  id: string;
  name: string;
  email: string;
  email_verified: boolean;
};
export type Session = Connection & { user: User; expires_at: number };
export type Saved = {
  id: string;
  filename: string;
  created_at: number;
  consent_version: string;
  analysis: Analysis;
  format?: string;
  normalized_available?: boolean;
};
export type ProcessingJob = {
  id: string;
  filename: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  statement_id: string | null;
  error: { code: string; message: string } | null;
};
type State = {
  session: Session | null;
  ready: boolean;
  records: Saved[];
  jobs: ProcessingJob[];
  cancelJob: (id: string) => Promise<void>;
  analysis: Analysis | null;
  busy: string;
  error: string;
  setError: (s: string) => void;
  perform: <T>(label: string, task: () => Promise<T>) => Promise<T | undefined>;
  authenticate: (
    mode: "login" | "register",
    url: string,
    email: string,
    password: string,
    name: string,
    accepted: boolean,
  ) => Promise<void>;
  refresh: () => Promise<void>;
  select: (r: Saved) => void;
  sample: () => Promise<void>;
  generatedDemo: () => Promise<void>;
  saveStatement: (
    file: DocumentPickerAsset,
    format: string,
    end: string,
  ) => Promise<void>;
  remove: (id: string) => Promise<void>;
  signOut: () => Promise<void>;
  erase: (password: string) => Promise<void>;
};
const Context = createContext<State | null>(null);
const STORAGE = "uqual.personal.session.v2";
async function persist(session: Session | null) {
  if (Platform.OS === "web") return;
  if (session) await SecureStore.setItemAsync(STORAGE, JSON.stringify(session));
  else await SecureStore.deleteItemAsync(STORAGE);
}
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null),
    [ready, setReady] = useState(false),
    [records, setRecords] = useState<Saved[]>([]),
    [jobs, setJobs] = useState<ProcessingJob[]>([]),
    [analysis, setAnalysis] = useState<Analysis | null>(null),
    [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  async function restore(s: Session) {
    const user = await request<User>(s, "/v1/me");
    const response = await request<{ statements: Saved[] }>(
      s,
      "/v1/statements",
    );
    const queued = await request<{jobs: ProcessingJob[]}>(s, "/v1/statement-jobs");
    setJobs(queued.jobs);
    setSession({ ...s, user });
    setRecords(response.statements);
    setAnalysis(response.statements[0]?.analysis ?? null);
  }
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw =
          Platform.OS === "web"
            ? null
            : await SecureStore.getItemAsync(STORAGE);
        if (raw && alive) {
          const saved: Session = JSON.parse(raw);
          validConnection(saved);
          if (saved.expires_at * 1000 > Date.now()) await restore(saved);
          else await persist(null);
        }
      } catch {
        if (alive)
          setError("Please sign in again to load your private statements.");
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  async function perform<T>(label: string, task: () => Promise<T>) {
    if (busy) return;
    setBusy(label);
    setError("");
    try {
      return await task();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy("");
    }
  }
  async function authenticate(
    mode: "login" | "register",
    origin: string,
    email: string,
    password: string,
    name: string,
    accepted: boolean,
  ) {
    const url = validConnection({ url: origin, token: "x".repeat(32) }).url;
    const data = await request<Omit<Session, "url">>(
      { url, token: "" },
      "/v1/auth/" + mode,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          ...(mode === "register"
            ? { name, accept_storage_policy: accepted }
            : {}),
        }),
      },
    );
    const s: Session = { ...data, url };
    await persist(s);
    await restore(s);
  }
  const hasActiveJobs = jobs.some((job) => job.status === "queued" || job.status === "running");
  useEffect(() => {
    if (!session || !hasActiveJobs) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const [saved, pending] = await Promise.all([
          request<{statements: Saved[]}>(session!, "/v1/statements"),
          request<{jobs: ProcessingJob[]}>(session!, "/v1/statement-jobs"),
        ]);
        if (stopped) return;
        setRecords(saved.statements);
        setJobs(pending.jobs);
        setAnalysis(saved.statements[0]?.analysis ?? null);
      } catch (error) {
        if (!stopped) setError(error instanceof Error ? error.message : "Could not refresh processing status.");
      }
      if (!stopped) timer = setTimeout(poll, 2500);
    }
    timer = setTimeout(poll, 1000);
    return () => { stopped = true; clearTimeout(timer); };
  }, [session, hasActiveJobs]);
  async function refresh() {
    if (!session) return;
    const [response, pending] = await Promise.all([
      request<{ statements: Saved[] }>(session, "/v1/statements"),
      request<{ jobs: ProcessingJob[] }>(session, "/v1/statement-jobs"),
    ]);
    setRecords(response.statements);
    setJobs(pending.jobs);
    setAnalysis(response.statements[0]?.analysis ?? null);
  }
  async function cancelJob(id: string) {
    await request(requireSession(), "/v1/statement-jobs/" + id, {method: "DELETE"});
    await refresh();
  }
  function requireSession() {
    if (!session) throw new Error("Please sign in");
    return session;
  }
  async function sample() {
    setAnalysis(
      await request<Analysis>(requireSession(), "/v1/sample", {
        method: "POST",
      }),
    );
  }
  async function generatedDemo() {
    const record = await request<Saved>(requireSession(), "/v1/statements/generated-demo", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ consent: true }),
    });
    await refresh();
    setAnalysis(record.analysis);
  }
  async function saveStatement(
    file: DocumentPickerAsset,
    format: string,
    end: string,
  ) {
    const form = new FormData();
    if (Platform.OS === "web" && file.file)
      form.append("file", file.file, file.name);
    else
      form.append("file", {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : file.name.toLowerCase().endsWith(".xlsx") ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv"),
      } as unknown as Blob);
    form.append("consent", "true");
    form.append("date_format", format);
    form.append("statement_end", end);
    const result = await request<ProcessingJob>(requireSession(), "/v1/statement-jobs", {
      method: "POST",
      body: form,
    });
    setJobs((current) => [result, ...current.filter((job) => job.id !== result.id)]);
    await refresh();
  }
  async function remove(id: string) {
    const removed = records.find((r) => r.id === id);
    await request(requireSession(), "/v1/statements/" + id, {
      method: "DELETE",
    });
    const response = await request<{ statements: Saved[] }>(
      requireSession(),
      "/v1/statements",
    );
    setRecords(response.statements);
    if (analysis?.assessment_id === removed?.analysis.assessment_id)
      setAnalysis(response.statements[0]?.analysis ?? null);
  }
  async function forget() {
    await persist(null);
    setSession(null);
    setRecords([]);
    setJobs([]);
    setAnalysis(null);
  }
  async function signOut() {
    try {
      await request(requireSession(), "/v1/auth/logout", { method: "POST" });
    } finally {
      await forget();
    }
  }
  async function erase(password: string) {
    await request(requireSession(), "/v1/me", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    await forget();
  }
  return (
    <Context.Provider
      value={{
        session,
        ready,
        records,
        jobs,
        cancelJob,
        analysis,
        busy,
        error,
        setError,
        perform,
        authenticate,
        refresh,
        select: (r) => setAnalysis(r.analysis),
        sample,
        generatedDemo,
        saveStatement,
        remove,
        signOut,
        erase,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useSession() {
  const state = useContext(Context);
  if (!state) throw new Error("Missing session provider");
  return state;
}
export { DEFAULT_URL };
