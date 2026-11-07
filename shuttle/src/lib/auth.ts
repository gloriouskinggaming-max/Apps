import type { User as SupabaseUser } from "@supabase/supabase-js";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import * as local from "./localAuth";
import { supabase } from "./supabase";

/**
 * One auth API for the app. Uses Supabase when it's configured, otherwise
 * falls back to accounts stored on this iPhone.
 */

export type User = local.User;

export type SignUpResult = { user: User } | { needsConfirmation: true };

function fromSupabase(u: SupabaseUser): User {
  const name = (u.user_metadata?.name as string | undefined) ?? (u.user_metadata?.full_name as string | undefined);
  return { id: u.id, email: u.email ?? "", name: name || (u.email ?? "Athlete").split("@")[0] };
}

const friendly = (message: string) => {
  if (/invalid login credentials/i.test(message)) return "Email or password is incorrect.";
  if (/email not confirmed/i.test(message)) return "Confirm your email first. Check your inbox for the link.";
  if (/already registered/i.test(message)) return "An account with that email already exists. Log in instead.";
  if (/network|fetch/i.test(message)) return "Couldn't reach the server. Check your internet connection.";
  return message;
};

// Supabase responses are a union of { data, error: null } and { data: null-ish, error }; keep the success branch.
type Ok<R> = R extends { error: null } ? R : never;

async function run<R extends { data: unknown; error: { message: string } | null }>(fn: () => PromiseLike<R>): Promise<Ok<R>["data"]> {
  let result;
  try {
    result = await fn();
  } catch (e) {
    throw new Error(friendly((e as Error).message));
  }
  if (result.error) throw new Error(friendly(result.error.message));
  return (result as Ok<R>).data;
}

export async function signUp(name: string, email: string, password: string): Promise<SignUpResult> {
  if (!supabase) return { user: await local.signUp(name, email, password) };
  if (!name.trim()) throw new Error("Enter your name.");
  if (password.length < 8) throw new Error("Use at least 8 characters for your password.");
  const data = await run(() =>
    supabase!.auth.signUp({ email: email.trim().toLowerCase(), password, options: { data: { name: name.trim() } } }),
  );
  // With "Confirm email" turned on in Supabase, there's no session until the user clicks the link.
  if (!data.session || !data.user) return { needsConfirmation: true };
  return { user: fromSupabase(data.user) };
}

export async function signIn(email: string, password: string): Promise<User> {
  if (!supabase) return local.signIn(email, password);
  const data = await run(() => supabase!.auth.signInWithPassword({ email: email.trim().toLowerCase(), password }));
  return fromSupabase(data.user);
}

export const appleSignInAvailable = async () => !!supabase && (await AppleAuthentication.isAvailableAsync().catch(() => false));

export async function signInWithApple(): Promise<User | null> {
  if (!supabase) throw new Error("Sign in with Apple needs Supabase to be configured.");
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      nonce: hashedNonce,
    });
  } catch (e) {
    if ((e as { code?: string }).code === "ERR_REQUEST_CANCELED") return null;
    throw e;
  }
  if (!credential.identityToken) throw new Error("Apple didn't return a sign-in token.");
  const data = await run(() => supabase!.auth.signInWithIdToken({ provider: "apple", token: credential.identityToken!, nonce: rawNonce }));
  // Apple only shares the name the very first time; save it to the profile.
  const fullName = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(" ");
  if (fullName && !data.user.user_metadata?.name) {
    const updated = await run(() => supabase!.auth.updateUser({ data: { name: fullName } }));
    return fromSupabase(updated.user);
  }
  return fromSupabase(data.user);
}

/** Emails a 6-digit code (requires {{ .Token }} in the Supabase "Reset password" email template). */
export async function sendPasswordReset(email: string) {
  if (!supabase) throw new Error("Password reset isn't available for accounts stored only on this phone.");
  await run(() => supabase!.auth.resetPasswordForEmail(email.trim().toLowerCase()));
}

export async function resetPassword(email: string, code: string, newPassword: string): Promise<User> {
  if (!supabase) throw new Error("Password reset isn't available for accounts stored only on this phone.");
  if (newPassword.length < 8) throw new Error("Use at least 8 characters for your password.");
  await run(() => supabase!.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: "recovery" }));
  const data = await run(() => supabase!.auth.updateUser({ password: newPassword }));
  return fromSupabase(data.user);
}

export async function signOut() {
  if (!supabase) return local.signOut();
  await supabase.auth.signOut();
}

export async function currentUser(): Promise<User | null> {
  if (!supabase) return local.currentUser();
  const { data } = await supabase.auth.getSession();
  return data.session ? fromSupabase(data.session.user) : null;
}

/** Calls the delete_user() database function, which removes the account and (via cascade) all its rows. */
export async function deleteAccount(id: string) {
  if (!supabase) return local.deleteAccount(id);
  await run(() => supabase!.rpc("delete_user"));
  await supabase.auth.signOut();
}

/** Notifies when the session changes (e.g. token expired or signed out elsewhere). */
export function onAuthChange(cb: (user: User | null) => void) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") cb(null);
    else if (event === "USER_UPDATED" && session) cb(fromSupabase(session.user));
  });
  return () => data.subscription.unsubscribe();
}
