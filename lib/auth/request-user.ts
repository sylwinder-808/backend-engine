import { cookies } from "next/headers";
import { verifyToken } from "../jwt";

export async function getUserFromCookie() {
  const cookieStore = await cookies();

  const allCookies = cookieStore.getAll();

  console.log("ALL COOKIES:", allCookies);

  const token = cookieStore.get("admin_token")?.value;

  console.log("TOKEN FOUND:", token ? "YES" : "NO");

  if (!token) {
    throw new Error("Unauthorized");
  }

  try {
    const user = verifyToken(token);

    console.log("JWT VALID:", user);

    return user as {
      id: number;
      role: string;
      tenantId?: string | null;
    };
  } catch (error) {
    console.log("JWT INVALID:", error);

    throw new Error("Unauthorized");
  }
}