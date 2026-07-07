import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";
import streamifier from "streamifier";

export async function PATCH(req: Request) {
  try {
    console.log(
      "BRANDING CONTENT TYPE:",
      req.headers.get("content-type")
    );

    const payload = getUserFromRequest(req);

    if (
      payload.role !== "CLIENT_ADMIN" &&
      payload.role !== "STAFF"
    ) {
      return Response.json(
        {
          success: false,
          error: "Forbidden",
        },
        {
          status: 403,
        }
      );
    }

    const formData = await req.formData();

    const siteName = String(formData.get("siteName") ?? "").trim();

    const file = formData.get("logoFile");

    let logoUrl: string | null = null;


    if (file instanceof File && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());

      const result: any = await new Promise(
        (resolve, reject) => {
          const stream =
            cloudinary.uploader.upload_stream(
              {
                folder: "branding",
              },
              (error, result) => {
                if (error) {
                  reject(error);
                  return;
                }

                resolve(result);
              }
            );

          streamifier
            .createReadStream(buffer)
            .pipe(stream);
        }
      );

      logoUrl = result.secure_url;
    }


    const setting =
      await prisma.siteSetting.upsert({
        where: {
          tenantId: payload.tenantId!,
        },

        update: {
          siteName,
          ...(logoUrl && {
            logoUrl,
          }),
        },

        create: {
          tenantId: payload.tenantId!,
          siteName,
          logoUrl: logoUrl ?? "",
        },
      });


    return Response.json({
      success: true,
      message: "Branding berhasil diperbarui",
      data: {
        logoUrl: setting.logoUrl,
        siteName: setting.siteName,
      },
    });

  } catch (error: any) {
    console.error(
      "BRANDING PATCH ERROR:",
      error
    );

    return Response.json(
      {
        success: false,
        message:
          error?.message ||
          "Update branding failed",
      },
      {
        status: 500,
      }
    );
  }
}