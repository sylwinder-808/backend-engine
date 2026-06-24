import { getUserFromRequest } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    getUserFromRequest(req);

    return Response.json({
      success: true,
      message: "Logged out",
    });
  } catch {
    return Response.json({
      success: false,
      error: "Unauthorized",
    });
  }
}