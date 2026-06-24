"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createSupabaseBrowserClient } from "@/lib/supabase/browser"

export function LoginForm() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [errorMessage, setErrorMessage] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    return (
        <Card className="w-full max-w-md border-border/70 shadow-lg">
            <CardHeader className="space-y-5">
                <div className="flex justify-center">
                    <Image
                        src="/assets/logos/solveonyx_logo.png"
                        alt="SolveOnyx"
                        width={1200}
                        height={320}
                        className="h-auto w-full max-w-[240px]"
                        priority
                    />
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <form
                    className="space-y-4"
                    onSubmit={async (event) => {
                        event.preventDefault()
                        setErrorMessage("")
                        setIsSubmitting(true)

                        try {
                            const supabase = createSupabaseBrowserClient()
                            const { error } = await supabase.auth.signInWithPassword({
                                email,
                                password
                            })

                            if (error) {
                                setErrorMessage(error.message)
                                return
                            }

                            router.push("/")
                            router.refresh()
                        } finally {
                            setIsSubmitting(false)
                        }
                    }}
                >
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            autoComplete="email"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            autoComplete="current-password"
                            required
                        />
                    </div>

                    {errorMessage ? (
                        <Alert variant="destructive">
                            <AlertTitle>Login failed</AlertTitle>
                            <AlertDescription>{errorMessage}</AlertDescription>
                        </Alert>
                    ) : null}

                    <div className="flex justify-center pt-2">
                        <Button type="submit" className="min-w-40" disabled={isSubmitting}>
                            {isSubmitting ? "Signing in..." : "Sign in"}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
