import { verifyToken } from "../jwt";

export function getUserFromCookie(req: Request) {
  const cookieHeader = req.headers.get("cookie");

  console.log("REQUEST COOKIE HEADER:", cookieHeader);

  if (!cookieHeader) {
    throw new Error("Unauthorized");
  }

  const token = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("admin_token="))
    ?.split("=")[1];

  console.log(
    "TOKEN FOUND:",
    token ? "YES" : "NO"
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