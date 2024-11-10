import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function convertToDateTime(time: string): Date {
  let now = new Date()

  let timeParts = time.split(":")
  let hour = parseInt(timeParts[0], 10)
  let minutes = parseInt(timeParts[1], 10)

  let date = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hour,
    minutes,
  )

  return date
}

export function convertToMantineTime(dateTimeString: string) {
  const date = new Date(dateTimeString)

  let hours = date.getHours().toString().padStart(2, "0")
  let minutes = date.getMinutes().toString().padStart(2, "0")

  return `${hours}:${minutes}`
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).format(date)
}

export type MandatoryFields<T> = {
  [K in keyof T]-?: NonNullable<T[K]>
}
