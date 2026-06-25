"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type PlatformDoc = {
    title: string
    filename: string
    content: string
}

type PlatformDocsViewerProps = {
    docs: PlatformDoc[]
}

function renderInlineMarkdown(text: string) {
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g)

    return parts.map((part, index) => {
        if (part.startsWith("`") && part.endsWith("`")) {
            return (
                <code key={`${part}-${index}`} className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                    {part.slice(1, -1)}
                </code>
            )
        }

        if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>
        }

        return <span key={`${part}-${index}`}>{part}</span>
    })
}

function MarkdownContent({ content }: { content: string }) {
    const rendered = useMemo(() => {
        const lines = content.split("\n")
        const nodes: React.ReactNode[] = []
        let codeLines: string[] = []
        let isInCodeBlock = false
        let listItems: string[] = []
        let listType: "bullet" | "numbered" | null = null

        function flushList() {
            if (!listType || listItems.length === 0) {
                return
            }

            const ListTag = listType === "numbered" ? "ol" : "ul"
            nodes.push(
                <ListTag
                    key={`list-${nodes.length}`}
                    className={cn(
                        "my-3 space-y-1 pl-6",
                        listType === "numbered" ? "list-decimal" : "list-disc"
                    )}
                >
                    {listItems.map((item, index) => (
                        <li key={`${item}-${index}`}>{renderInlineMarkdown(item)}</li>
                    ))}
                </ListTag>
            )

            listItems = []
            listType = null
        }

        lines.forEach((line) => {
            if (line.startsWith("```")) {
                if (isInCodeBlock) {
                    nodes.push(
                        <pre
                            key={`code-${nodes.length}`}
                            className="my-4 overflow-x-auto rounded-md border bg-muted p-4 font-mono text-xs leading-relaxed"
                        >
                            <code>{codeLines.join("\n")}</code>
                        </pre>
                    )
                    codeLines = []
                    isInCodeBlock = false
                    return
                }

                flushList()
                isInCodeBlock = true
                return
            }

            if (isInCodeBlock) {
                codeLines.push(line)
                return
            }

            if (!line.trim()) {
                flushList()
                return
            }

            if (line.trim() === "---") {
                flushList()
                nodes.push(<hr key={`hr-${nodes.length}`} className="my-5 border-border" />)
                return
            }

            const headingMatch = line.match(/^(#{1,4})\s+(.+)$/)
            if (headingMatch) {
                flushList()
                const level = headingMatch[1].length
                const text = headingMatch[2]
                const className =
                    level === 1
                        ? "mt-2 mb-4 text-2xl font-semibold tracking-tight"
                        : level === 2
                          ? "mt-6 mb-3 text-xl font-semibold tracking-tight"
                          : level === 3
                            ? "mt-5 mb-2 text-lg font-semibold"
                            : "mt-4 mb-2 text-base font-semibold"

                if (level === 1) {
                    nodes.push(
                        <h1 key={`heading-${nodes.length}`} className={className}>
                            {renderInlineMarkdown(text)}
                        </h1>
                    )
                } else if (level === 2) {
                    nodes.push(
                        <h2 key={`heading-${nodes.length}`} className={className}>
                            {renderInlineMarkdown(text)}
                        </h2>
                    )
                } else if (level === 3) {
                    nodes.push(
                        <h3 key={`heading-${nodes.length}`} className={className}>
                            {renderInlineMarkdown(text)}
                        </h3>
                    )
                } else {
                    nodes.push(
                        <h4 key={`heading-${nodes.length}`} className={className}>
                            {renderInlineMarkdown(text)}
                        </h4>
                    )
                }
                return
            }

            const bulletMatch = line.match(/^\s*-\s+(.+)$/)
            if (bulletMatch) {
                if (listType !== "bullet") {
                    flushList()
                    listType = "bullet"
                }
                listItems.push(bulletMatch[1])
                return
            }

            const numberedMatch = line.match(/^\s*\d+\.\s+(.+)$/)
            if (numberedMatch) {
                if (listType !== "numbered") {
                    flushList()
                    listType = "numbered"
                }
                listItems.push(numberedMatch[1])
                return
            }

            flushList()
            nodes.push(
                <p key={`paragraph-${nodes.length}`} className="my-3 leading-7">
                    {renderInlineMarkdown(line)}
                </p>
            )
        })

        flushList()

        if (isInCodeBlock && codeLines.length > 0) {
            nodes.push(
                <pre
                    key={`code-${nodes.length}`}
                    className="my-4 overflow-x-auto rounded-md border bg-muted p-4 font-mono text-xs leading-relaxed"
                >
                    <code>{codeLines.join("\n")}</code>
                </pre>
            )
        }

        return nodes
    }, [content])

    return <div className="max-w-none text-sm text-foreground">{rendered}</div>
}

export function PlatformDocsViewer({ docs }: PlatformDocsViewerProps) {
    const [expandedFiles, setExpandedFiles] = useState(() => new Set(docs.map((doc) => doc.filename)))

    function expandAll() {
        setExpandedFiles(new Set(docs.map((doc) => doc.filename)))
    }

    function collapseAll() {
        setExpandedFiles(new Set())
    }

    function toggleFile(filename: string) {
        setExpandedFiles((current) => {
            const next = new Set(current)

            if (next.has(filename)) {
                next.delete(filename)
            } else {
                next.add(filename)
            }

            return next
        })
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={expandAll}>
                    Expand All
                </Button>
                <Button type="button" variant="outline" onClick={collapseAll}>
                    Collapse All
                </Button>
            </div>

            {docs.map((doc) => {
                const isExpanded = expandedFiles.has(doc.filename)
                const Icon = isExpanded ? ChevronDown : ChevronRight

                return (
                    <Card key={doc.filename}>
                        <CardHeader>
                            <button
                                type="button"
                                className="flex w-full items-start gap-3 text-left"
                                onClick={() => toggleFile(doc.filename)}
                                aria-expanded={isExpanded}
                            >
                                <Icon className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                <div className="min-w-0 space-y-1">
                                    <CardTitle>{doc.title}</CardTitle>
                                    <p className="font-mono text-xs text-muted-foreground">{doc.filename}</p>
                                </div>
                            </button>
                        </CardHeader>
                        {isExpanded ? (
                            <CardContent className="border-t pt-4">
                                <MarkdownContent content={doc.content} />
                            </CardContent>
                        ) : null}
                    </Card>
                )
            })}
        </div>
    )
}
