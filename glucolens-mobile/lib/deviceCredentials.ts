/**
 * Device-account credential persistence.
 *
 * The app signs each device up with a generated email+password pair
 * (anonymous auth is disabled on this Supabase project). These credentials
 * are stored so the account can be recovered after session-token loss.
 * SecureStore is used on native; AsyncStorage on web (SecureStore is
 * unavailable there).
 */

import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

/**
 * Emails matching this pattern are silent per-device accounts generated at
 * first launch. Anything else means the user attached a real email
 * ("secured" their account).
 */
export const DEVICE_EMAIL_RE = /^device_.*@glucolens\.app$/;

const CRED_EMAIL_KEY = "gl_device_email";
const CRED_PASSWORD_KEY = "gl_device_password";

export async function getStoredCredentials(): Promise<{ email: string; password: string } | null> {
  try {
    let email: string | null;
    let password: string | null;
    if (Platform.OS === "web") {
      email = await AsyncStorage.getItem(CRED_EMAIL_KEY);
      password = await AsyncStorage.getItem(CRED_PASSWORD_KEY);
    } else {
      email = await SecureStore.getItemAsync(CRED_EMAIL_KEY);
      password = await SecureStore.getItemAsync(CRED_PASSWORD_KEY);
    }
    return email && password ? { email, password } : null;
  } catch {
    return null;
  }
}

export async function storeCredentials(email: string, password: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      await AsyncStorage.setItem(CRED_EMAIL_KEY, email);
      await AsyncStorage.setItem(CRED_PASSWORD_KEY, password);
    } else {
      await SecureStore.setItemAsync(CRED_EMAIL_KEY, email);
      await SecureStore.setItemAsync(CRED_PASSWORD_KEY, password);
    }
  } catch {
    // Best-effort — signUp still proceeds; recovery just won't be possible.
  }
}

export async function clearStoredCredentials(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      await AsyncStorage.removeItem(CRED_EMAIL_KEY);
      await AsyncStorage.removeItem(CRED_PASSWORD_KEY);
    } else {
      await SecureStore.deleteItemAsync(CRED_EMAIL_KEY);
      await SecureStore.deleteItemAsync(CRED_PASSWORD_KEY);
    }
  } catch {}
}
