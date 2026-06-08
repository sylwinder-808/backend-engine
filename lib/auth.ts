import { verifyToken } from "./jwt";

export function getUserFromRequest(req: Request) {
  const auth = req.headers.get("authorization");

  if (!auth) {
    throw new Error("Unauthorized");
  }

  const token = auth.replace("Bearer ", "");

  return verifyToken(token) as {
    id: number;
    role: string;
    tenantId?: string | null;
  };
}