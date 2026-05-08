import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const user = await prisma.user.findUnique({
      where: {
        username: body.username,
      },
    });

    if (!user) {
      return Response.json({
        success: false,
        error: "Username not found",
      });
    }

    const validPassword = await bcrypt.compare(
      body.password,
      user.password
    );

    if (!validPassword) {
      return Response.json({
        success: false,
        error: "Wrong password",
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET missing");
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return Response.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.log("LOGIN ERROR:", error);

    return Response.json({
      success: false,
      error: "Login failed",
    });
  }
}