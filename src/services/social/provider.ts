import { type SupabaseClient } from "@supabase/supabase-js";
import { type OnlineIdentity, type SyncJob } from "../../domain/model";
export interface PublicDocument {
  public_id: string;
  visibility: "Public" | "Unlisted";
  kind: "list" | "profile" | "review";
  payload: Record<string, unknown>;
  revision: number;
}
export interface SocialBackendProvider {
  configured: boolean;
  identity(): Promise<OnlineIdentity | null>;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<string>;
  signOut(): Promise<void>;
  publish(job: SyncJob): Promise<void>;
  read(publicId: string): Promise<PublicDocument | null>;
}
export class SupabaseSocialProvider implements SocialBackendProvider {
  readonly configured: boolean;
  private client: Promise<SupabaseClient> | null = null;
  private url: string;
  private key: string;
  constructor(
    url = import.meta.env.VITE_SUPABASE_URL ?? "",
    key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
  ) {
    this.configured = Boolean(url && key);
    this.url = url;
    this.key = key;
  }
  private get() {
    if (!this.configured) throw new Error("Online sharing is not configured.");
    if (!this.client)
      this.client = import("@supabase/supabase-js")
        .then(({ createClient }) =>
          createClient(this.url, this.key, {
            auth: {
              storageKey: "nexume.online.session",
              detectSessionInUrl: false,
            },
          }),
        )
        .catch((error) => {
          this.client = null;
          throw error;
        });
    return this.client;
  }
  async identity() {
    if (!this.configured) return null;
    const { data, error } = await (await this.get()).auth.getUser();
    if (error || !data.user) return null;
    return { userId: data.user.id, email: data.user.email ?? "" };
  }
  async signIn(email: string, password: string) {
    const { error } = await (
      await this.get()
    ).auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  }
  async signUp(email: string, password: string) {
    const { data, error } = await (
      await this.get()
    ).auth.signUp({ email, password });
    if (error) throw error;
    return data.session
      ? "Account created."
      : "Check your email to confirm your account, then sign in.";
  }
  async signOut() {
    const { error } = await (await this.get()).auth.signOut();
    if (error) throw error;
  }
  async publish(job: SyncJob) {
    const identity = await this.identity();
    if (identity?.userId !== job.ownerId)
      throw new Error("Sign in to the account that owns this publication.");
    const { error } = await (
      await this.get()
    ).rpc("publish_document", {
      p_public_id: job.publicId,
      p_kind: job.kind,
      p_visibility:
        job.operation === "delete" ? "Private" : job.payload.visibility,
      p_payload: job.operation === "delete" ? {} : job.payload.document,
      p_revision: job.revision,
      p_deleted: job.operation === "delete",
    });
    if (error) throw error;
  }
  async read(publicId: string) {
    const { data, error } = await (
      await this.get()
    )
      .rpc("read_public_document", { p_public_id: publicId })
      .maybeSingle();
    if (error) throw error;
    return data as PublicDocument | null;
  }
}
export const social = new SupabaseSocialProvider();
export { publicLink } from "./urls";
