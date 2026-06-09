import { verifyToken } from "./jwt";

export function verifyAdmin(req: Request) {
  const authHeader =
    req.headers.get("authorization");

  if (!authHeader) {
    return null;
  }

  const token = authHeader.split(" ")[1];

  const decoded: any = verifyToken(token);

  if (!decoded) {
    return null;
  }

  if (decoded.role !== "admin") {
    return null;
  }

  return decoded;
}