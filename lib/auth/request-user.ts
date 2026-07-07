import { verifyToken } from "../jwt";

export function getUserFromRequest(req: Request) {
  const authorization = req.headers.get("authorization");

  console.log(
    "AUTHORIZATION HEADER:",
    authorization ? "ADA" : "TIDAK ADA"
  );


  if (!authorization) {
    throw new Error("Unauthorized");
  }


  const token = authorization
    .replace(/^Bearer\s+/i, "")
    .trim();


  if (!token) {
    throw new Error("Unauthorized");
  }


  return verifyToken(token) as {
    id: number;
    role: string;
    tenantId?: string | null;
  };
}