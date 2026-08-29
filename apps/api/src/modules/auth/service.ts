import type { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";
import type { RegisterInput, LoginInput } from "./schema.js";

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  async register(data: RegisterInput) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new AuthError("Email already registered", "EMAIL_EXISTS", 409);
    }

    const hashedPassword = await argon2.hash(data.password, {
      type: argon2.argon2id,
    });

    // Auto-promote to ADMIN if this is the first user in the system
    const userCount = await this.prisma.user.count();
    const role = userCount === 0 ? "ADMIN" : "USER";

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return user;
  }

  async login(data: LoginInput) {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new AuthError("Invalid email or password", "INVALID_CREDENTIALS", 401);
    }

    const validPassword = await argon2.verify(user.password, data.password);

    if (!validPassword) {
      throw new AuthError("Invalid email or password", "INVALID_CREDENTIALS", 401);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AuthError("User not found", "USER_NOT_FOUND", 404);
    }

    return user;
  }
}

export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "AuthError";
  }
}
