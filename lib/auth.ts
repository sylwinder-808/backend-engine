import { verifyToken } from "./jwt";

export function getUserFromRequest(req: Request) {
  const cookieHeader = req.headers.get("cookie");

  if (!cookieHeader) {
    throw new Error("Unauthorized");
  }

  const token = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("admin_token="))
    ?.split("=")[1];

  if (!token) {
    throw new Error("Unauthorized");
  }

  return verifyToken(token) as {
    id: number;
    role: string;
    tenantId?: string | null;
  };
}