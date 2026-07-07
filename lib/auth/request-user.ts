import { cookies } from "next/headers";
import { verifyToken } from "../jwt";

export async function getUserFromCookie() {
  const cookieStore = await cookies();

  console.log(
    "SERVER COOKIES:",
    cookieStore.getAll()
  );

  const token = cookieStore.get("admin_token")?.value;

  console.log(
    "ADMIN TOKEN ADA:",
    !!token
  );

  if (!token) {
    throw new Error("Unauthorized");
  }

  return verifyToken(token) as {
    id: number;
    role: string;
    tenantId?: string | null;
  };
}