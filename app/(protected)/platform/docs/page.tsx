import { readFile } from "node:fs/promises"
import path from "node:path"
import { redirect } from "next/navigation"
import { PlatformDocsViewer, type PlatformDoc } from "@/components/platform-docs-viewer"
import { getCurrentUserContext } from "@/lib/auth"

const docsDirectory = path.join(process.cwd(), "docs")

const docFiles: Array<{
    title: string
    filename: string
}> = [
    { title: "Platform Overview", filename: "PLATFORM_OVERVIEW.md" },
    { title: "Database & Security", filename: "DATABASE_AND_SECURITY.md" },
    { title: "Frontend Architecture", filename: "FRONTEND_ARCHITECTURE.md" },
    { title: "Development Log", filename: "DEVELOPMENT_LOG.md" }
]

async function getPlatformDocs(): Promise<PlatformDoc[]> {
    return Promise.all(
        docFiles.map(async (doc) => ({
            ...doc,
            content: await readFile(path.join(docsDirectory, doc.filename), "utf8")
        }))
    )
}

export default async function PlatformDocsPage() {
    const context = await getCurrentUserContext()

    if (!context.isPlatformAdmin) {
        redirect("/auth/error?reason=unauthorized-platform")
    }

    const docs = await getPlatformDocs()

    return (
        <div className="flex min-h-screen justify-center p-6">
            <div className="w-full max-w-6xl space-y-6">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Platform Documentation</h1>
                    <p className="text-sm text-muted-foreground">
                        Internal documentation for the SolveOnyx platform architecture, database, frontend, and
                        development history.
                    </p>
                </div>

                <PlatformDocsViewer docs={docs} />
            </div>
        </div>
    )
}
