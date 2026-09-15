import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Chromium extension sync branding for onboarding copy. */
export function getChromiumBrowserName(): "Edge" | "Chrome" {
  if (typeof navigator !== "undefined" && /Edg\//.test(navigator.userAgent)) {
    return "Edge"
  }
  return "Chrome"
}
