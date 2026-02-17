
import Constants from "expo-constants";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { BEARER_TOKEN_KEY } from "@/lib/auth";

export const BACKEND_URL =
  Constants.expoConfig?.extra?.backendUrl ||
  "https://3az2ndteth9e6e3ftqke6u4yj9646gyu.app.specular.dev";

export async function getBearerToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(BEARER_TOKEN_KEY);
  } else {
    try {
      return await SecureStore.getItemAsync(BEARER_TOKEN_KEY);
    } catch (error) {
      console.error("[getBearerToken] Error:", error);
      return null;
    }
  }
}

export async function apiGet(path: string) {
  const url = `${BACKEND_URL}${path}`;
  console.log(`[API] GET ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[API] GET ${path} failed:`, response.status, errorText);
    throw new Error(`API Error: ${response.status} ${errorText}`);
  }
  return response.json();
}

export async function apiPost(path: string, data: any) {
  const url = `${BACKEND_URL}${path}`;
  console.log(`[API] POST ${url}`, data);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[API] POST ${path} failed:`, response.status, errorText);
    throw new Error(`API Error: ${response.status} ${errorText}`);
  }
  return response.json();
}

export async function authenticatedGet(path: string) {
  const token = await getBearerToken();
  const url = `${BACKEND_URL}${path}`;
  console.log(`[API] Authenticated GET ${url}`);
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[API] GET ${path} failed:`, response.status, errorText);
    throw new Error(`API Error: ${response.status} ${errorText}`);
  }
  return response.json();
}

export async function authenticatedPost(path: string, data: any) {
  const token = await getBearerToken();
  const url = `${BACKEND_URL}${path}`;
  console.log(`[API] Authenticated POST ${url}`, data);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[API] POST ${path} failed:`, response.status, errorText);
    throw new Error(`API Error: ${response.status} ${errorText}`);
  }
  return response.json();
}

export async function authenticatedPut(path: string, data: any) {
  const token = await getBearerToken();
  const url = `${BACKEND_URL}${path}`;
  console.log(`[API] Authenticated PUT ${url}`, data);
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[API] PUT ${path} failed:`, response.status, errorText);
    throw new Error(`API Error: ${response.status} ${errorText}`);
  }
  return response.json();
}

export async function authenticatedDelete(path: string) {
  const token = await getBearerToken();
  const url = `${BACKEND_URL}${path}`;
  console.log(`[API] Authenticated DELETE ${url}`);
  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[API] DELETE ${path} failed:`, response.status, errorText);
    throw new Error(`API Error: ${response.status} ${errorText}`);
  }
  return response.json();
}

export async function uploadImage(
  uri: string,
  label: string,
  fieldName: string
): Promise<{ url: string; label: string }> {
  try {
    const token = await getBearerToken();
    console.log(`[API] Uploading image: ${fieldName} with label: ${label}`);

    const formData = new FormData();

    if (Platform.OS === "web") {
      const response = await fetch(uri);
      const blob = await response.blob();
      const file = new File([blob], `${fieldName}.jpg`, { type: "image/jpeg" });
      formData.append("image", file);
    } else {
      formData.append("image", {
        uri,
        type: "image/jpeg",
        name: `${fieldName}.jpg`,
      } as any);
    }

    const uploadResponse = await fetch(`${BACKEND_URL}/api/upload/image`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error(`[API] Image upload failed:`, uploadResponse.status, errorText);
      throw new Error(`Upload failed: ${uploadResponse.status}`);
    }

    const result = await uploadResponse.json();
    console.log(`[API] Image uploaded successfully:`, result.url);

    return {
      url: result.url,
      label: label,
    };
  } catch (error) {
    console.error(`[API] Error uploading image:`, error);
    throw error;
  }
}
