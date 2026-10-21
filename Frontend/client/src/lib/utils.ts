import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns current Date in Indian Standard Time (Asia/Kolkata).
 */
export function getISTDate(): Date {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
}

/**
 * Returns time-appropriate greeting in Indian Standard Time.
 */
export function getISTGreeting(): string {
  const istDate = getISTDate();
  const hour = istDate.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Format a date explicitly in Indian Standard Time (Asia/Kolkata, en-IN).
 */
export function formatISTDate(
  date?: Date | string | number | null,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = !date ? new Date() : (typeof date === "string" || typeof date === "number" ? new Date(date) : date);
  return d.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    ...options
  });
}

/**
 * Format date & time explicitly in Indian Standard Time (Asia/Kolkata, en-IN).
 */
export function formatISTDateTime(
  date?: Date | string | number | null,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = !date ? new Date() : (typeof date === "string" || typeof date === "number" ? new Date(date) : date);
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    ...options
  });
}

