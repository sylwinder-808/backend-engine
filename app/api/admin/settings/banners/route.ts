import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";
import streamifier from "streamifier";

function cleanString(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function toBoolean(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true";
  return fallback;
}

function toNumber(value: unknown) {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

export async function POST(req: Request) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload?.tenantId) {
      return Response.json({ success: false, error: "Unauthorized" });
    }

    const formData = await req.formData();

    const title = cleanString(formData.get("title"));
    const subtitle = formData.get("subtitle") as string | null;
    const href = formData.get("href") as string | null;
    const placement = cleanString(formData.get("placement")) || "HOME";
    const isActive = toBoolean(formData.get("isActive"), true);
    const sortOrder = toNumber(formData.get("sortOrder"));

    const file = formData.get("image") as File | null;

    let imageUrl: string | null = null;

    // 🔥 UPLOAD KE CLOUDINARY
    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());

      const result: any = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "banners" },
          (err, result) => {
            if (result) resolve(result);
            else reject(err);
          }
        );

        streamifier.createReadStream(buffer).pipe(stream);
      });

      imageUrl = result.secure_url;
    }

    if (!title) {
      return Response.json({
        success: false,
        error: "Title wajib diisi.",
      });
    }

    const banner = await prisma.banner.create({
      data: {
        tenantId: payload.tenantId,
        title,
        subtitle,
        imageUrl: imageUrl ?? "",
        href,
        placement,
        isActive,
        sortOrder,
      },
    });

    return Response.json({
      success: true,
      banner,
    });
  } catch (error) {
    console.error("CREATE_ADMIN_BANNER_ERROR:", error);

    return Response.json({
      success: false,
      error: "Create banner failed",
    });
  }
}