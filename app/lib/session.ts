import { SessionOptions } from "iron-session";

export interface SessionData {
  accessCodeId?: string;
  isAtelier?: boolean;
  createdAt?: number;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || "dev-secret-must-be-at-least-32-chars-long!!",
  cookieName: "lumen_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: 60 * 60 * 24, // 24 hours
  },
};
