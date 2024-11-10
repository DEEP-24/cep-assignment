import { createCookieSessionStorage, redirect } from "@remix-run/node";
import * as bcrypt from "bcryptjs";
import invariant from "tiny-invariant";
import { UserRole } from "~/roles";

invariant(process.env.SESSION_SECRET, "SESSION_SECRET must be set");

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [process.env.SESSION_SECRET],
    secure: process.env.NODE_ENV === "production",
  },
});

const USER_SESSION_KEY = "userId";
const USER_ROLE_KEY = "role";
const thirtyDaysInSeconds = 60 * 60 * 24 * 30;

export async function getSession(request: Request) {
  const cookie = request.headers.get("Cookie");
  return sessionStorage.getSession(cookie);
}

export async function createUserSession({
  request,
  userId,
  redirectTo,
  role,
}: {
  request: Request;
  userId: string;
  remember: boolean;
  redirectTo: string;
  role: string;
}) {
  const session = await getSession(request);
  session.set(USER_SESSION_KEY, userId);
  session.set(USER_ROLE_KEY, role);

  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session, {
        maxAge: thirtyDaysInSeconds,
      }),
    },
  });
}

export async function getUserId(request: Request): Promise<string | undefined> {
  const session = await getSession(request);
  const userId = session.get(USER_SESSION_KEY);
  return userId;
}

export async function getUserRole(
  request: Request
): Promise<UserRole | undefined> {
  const session = await getSession(request);
  const userRole = session.get(USER_ROLE_KEY);
  return userRole;
}

export async function requireUserId(request: Request) {
  const userId = await getUserId(request);
  if (!userId) {
    throw redirect("/");
  }

  return userId;
}

export async function logout(request: Request) {
  const session = await getSession(request);
  return redirect("/", {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
}

export function createPasswordHash(password: string) {
  return bcrypt.hash(password, 10);
}

export async function isAdmin(request: Request) {
  const session = await getSession(request);
  return session.get(USER_ROLE_KEY) === UserRole.ADMIN;
}

export async function isFaculty(request: Request) {
  const session = await getSession(request);
  return session.get(USER_ROLE_KEY) === UserRole.FACULTY;
}

export async function isStudent(request: Request) {
  const session = await getSession(request);
  return session.get(USER_ROLE_KEY) === UserRole.STUDENT;
}
