import { cookies } from "next/headers";
import { verifyToken } from "../jwt";

export async function getUserFromCookie() {
  const cookieStore = await cookies();

  const token = cookieStore.get("admin_token")?.value;

  if (!token) {
    throw new Error("Unauthorized");
  }

  return verifyToken(token) as {
    id: number;
    role: string;
    tenantId?: string | null;
  };
}