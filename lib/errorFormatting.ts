export function formatError(error: unknown): string {
    if (error instanceof Error) {
        return error.message
    }

    if (typeof error === "string") {
        return error
    }

    if (error && typeof error === "object") {
        const candidate = error as Record<string, unknown>
        const message = typeof candidate.message === "string" ? candidate.message : ""
        const details = typeof candidate.details === "string" ? candidate.details : ""
        const hint = typeof candidate.hint === "string" ? candidate.hint : ""
        const code = typeof candidate.code === "string" ? candidate.code : ""

        return [message, details, hint, code ? `code: ${code}` : ""]
            .filter(Boolean)
            .join(" | ") || JSON.stringify(candidate)
    }

    return "Unknown error"
}
