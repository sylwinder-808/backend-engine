import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";
import streamifier from "streamifier";

export async function PATCH(req: Request) {
  try {
    const payload = getUserFromRequest(req);

    if (
      payload.role !== "CLIENT_ADMIN" &&
      payload.role !== "STAFF"
    ) {
      return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();

    const siteName = formData.get("siteName") as string;
    const file = formData.get("logoFile") as File | null;

    let logoUrl: string | null = null;

    // 🔥 UPLOAD KE CLOUDINARY JIKA ADA FILE
    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());

      const result: any = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "branding" },
          (err, result) => {
            if (result) resolve(result);
            else reject(err);
          }
        );

        streamifier.createReadStream(buffer).pipe(stream);
      });

      logoUrl = result.secure_url;
    }

    // 🔥 UPSERT DB
    const setting = await prisma.siteSetting.upsert({
      where: {
        tenantId: payload.tenantId!,
      },
      update: {
        siteName,
        ...(logoUrl && { logoUrl }),
      },
      create: {
        tenantId: payload.tenantId!,
        siteName,
        logoUrl: logoUrl ?? "",
      },
    });

    return Response.json({
      success: true,
      setting,
    });
  } catch (error: any) {
    console.error(error);

    return Response.json({
      success: false,
      error: "Update branding failed",
    }, { status: 500 });
  }
}