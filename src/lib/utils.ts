import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const apiURL =
    process.env.NODE_ENV === "production"
        ? "https://openai-api-worker.oghenekaro-arausi.workers.dev"
        : "http://localhost:8787";
