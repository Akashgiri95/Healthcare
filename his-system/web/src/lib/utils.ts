import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, differenceInYears } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calcAge(dob: string): string {
  const years = differenceInYears(new Date(), new Date(dob));
  return `${years}Y`;
}

export function fmtDate(d: string | Date): string {
  return format(new Date(d), "dd MMM yyyy");
}

export function fmtTime(t: string): string {
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

export function fmtCurrency(n: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);
}
