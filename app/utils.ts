import { useMatches } from "@remix-run/react"
import { useMemo } from "react"

const DEFAULT_REDIRECT = "/"

/**
 * This should be used any time the redirect path is user-provided
 * (Like the query string on our login/signup pages). This avoids
 * open-redirect vulnerabilities.
 * @param {string} to The redirect destination
 * @param {string} defaultRedirect The redirect to use if the to is unsafe.
 */
export function safeRedirect(
  to: FormDataEntryValue | string | null | undefined,
  defaultRedirect: string = DEFAULT_REDIRECT,
) {
  if (!to || typeof to !== "string") {
    return defaultRedirect
  }

  if (!to.startsWith("/") || to.startsWith("//")) {
    return defaultRedirect
  }

  return to
}

/**
 * This base hook is used in other hooks to quickly search for specific data
 * across all loader data using useMatches.
 * @param {string} id The route id
 * @returns {JSON|undefined} The router data or undefined if not found
 */
export function useMatchesData(
  id: string,
): Record<string, unknown> | undefined {
  const matchingRoutes = useMatches()
  const route = useMemo(
    () => matchingRoutes.find((route) => route.id === id),
    [matchingRoutes, id],
  )
  return route?.data
}

export function validateEmail(email: unknown): email is string {
  return typeof email === "string" && email.length > 3 && email.includes("@")
}

export function formatTime(date: Date | string) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}

export const toFixedDate = (date: Date | string) => {
  let _date
  if (date instanceof Date) {
    _date = date
  } else {
    _date = new Date(date)
  }

  const fixedDate = new Date("2000-01-01T00:00:00Z")
  return new Date(
    fixedDate.getFullYear(),
    fixedDate.getMonth(),
    fixedDate.getDate(),
    _date.getHours(),
    _date.getMinutes(),
    _date.getSeconds(),
    _date.getMilliseconds(),
  )
}
