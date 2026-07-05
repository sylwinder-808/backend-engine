import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";
import streamifier from "streamifier";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = getUserFromRequest(req);
    const { id } = await params;

    if (!payload?.tenantId) {
      return Response.json({ success: false, error: "Unauthorized" });
    }

    const existing = await prisma.banner.findFirst({
      where: {
        id,
        tenantId: payload.tenantId,
      },
    });

    if (!existing) {
      return Response.json({ success: false, error: "Banner not found" });
    }

    // 🔥 GANTI JSON → FORM DATA
    const formData = await req.formData();

    const title = (formData.get("title") as string) || existing.title;
    const subtitle = formData.get("subtitle") as string | null ?? existing.subtitle;
    const href = formData.get("href") as string | null ?? existing.href;
    const placement = (formData.get("placement") as string) || existing.placement;

    const isActive =
      formData.get("isActive") !== null
        ? formData.get("isActive") === "true"
        : existing.isActive;

    const sortOrder =
      formData.get("sortOrder") !== null
        ? Number(formData.get("sortOrder"))
        : existing.sortOrder;

    const file = formData.get("image") as File | null;

    let imageUrl = existing.imageUrl;

    // 🔥 UPLOAD KE CLOUDINARY JIKA ADA FILE BARU
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

    const banner = await prisma.banner.update({
      where: { id: existing.id },
      data: {
        title,
        subtitle,
        href,
        placement,
        isActive,
        sortOrder,
        imageUrl, // 🔥 FIXED
      },
    });

    return Response.json({
      success: true,
      banner,
    });
  } catch (error: any) {
    console.error("UPDATE_ADMIN_BANNER_ERROR:", error);

    return Response.json({
      success: false,
      error: error.message || "Update failed",
    });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = getUserFromRequest(req);
    const { id } = await params;

    if (!payload?.tenantId) {
      return Response.json({ success: false, error: "Unauthorized" });
    }

    const existing = await prisma.banner.findFirst({
      where: {
        id,
        tenantId: payload.tenantId,
      },
    });

    if (!existing) {
      return Response.json({
        success: false,
        error: "Banner not found",
      }, { status: 404 });
    }

    await prisma.banner.delete({
      where: { id },
    });

    return Response.json({
      success: true,
      message: "Banner deleted successfully",
    });
  } catch (error: any) {
    console.error("DELETE_ADMIN_BANNER_ERROR:", error);

    return Response.json({
      success: false,
      error: error.message || "Delete failed",
    });
  }
}