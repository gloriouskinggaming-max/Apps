import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

/**
 * Accounts that live on this iPhone.
 *
 * This is the "no server" option: sign-up, login and logout work, and each
 * person's data is kept separate, but accounts don't sync between devices.
 * To sync across devices, replace these functions with a hosted auth provider
 * (Supabase, Firebase or Sign in with Apple). The rest of the app only uses
 * `signUp`, `signIn`, `signOut` and `currentUser`.
 */

export interface User {
  id: string;
  name: string;
  email: string;
}

interface StoredUser extends User {
  salt: string;
  hash: string;
}

const USERS_KEY = "shuttle.users.v1";
const SESSION_KEY = "shuttle.session";
const ROUNDS = 500;

async function hashPassword(password: string, salt: string) {
  let h = `${salt}:${password}`;
  for (let i = 0; i < ROUNDS; i++) h = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}${h}`);
  return h;
}

async function loadUsers(): Promise<StoredUser[]> {
  return JSON.parse((await AsyncStorage.getItem(USERS_KEY)) ?? "[]");
}

const normalize = (email: string) => email.trim().toLowerCase();
const publicUser = ({ id, name, email }: StoredUser): User => ({ id, name, email });

export async function signUp(name: string, email: string, password: string): Promise<User> {
  if (!name.trim()) throw new Error("Enter your name.");
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) throw new Error("Enter a valid email address.");
  if (password.length < 8) throw new Error("Use at least 8 characters for your password.");
  const users = await loadUsers();
  if (users.some((u) => u.email === normalize(email))) throw new Error("An account with that email already exists. Log in instead.");
  const salt = Array.from(Crypto.getRandomBytes(16), (b) => b.toString(16).padStart(2, "0")).join("");
  const user: StoredUser = { id: Crypto.randomUUID(), name: name.trim(), email: normalize(email), salt, hash: await hashPassword(password, salt) };
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify([...users, user]));
  await SecureStore.setItemAsync(SESSION_KEY, user.id);
  return publicUser(user);
}

export async function signIn(email: string, password: string): Promise<User> {
  const user = (await loadUsers()).find((u) => u.email === normalize(email));
  if (!user || (await hashPassword(password, user.salt)) !== user.hash) throw new Error("Email or password is incorrect.");
  await SecureStore.setItemAsync(SESSION_KEY, user.id);
  return publicUser(user);
}

export async function signOut() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export async function currentUser(): Promise<User | null> {
  const id = await SecureStore.getItemAsync(SESSION_KEY);
  if (!id) return null;
  const user = (await loadUsers()).find((u) => u.id === id);
  return user ? publicUser(user) : null;
}

export async function deleteAccount(id: string) {
  const users = await loadUsers();
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users.filter((u) => u.id !== id)));
  await AsyncStorage.removeItem(`shuttle.data.${id}`);
  await signOut();
}
