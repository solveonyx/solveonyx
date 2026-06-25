import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function AppHomePage() {
    return (
        <div className="flex min-h-screen justify-center p-6">
            <div className="w-full max-w-3xl">
                <Card>
                    <CardHeader>
                        <CardTitle>Homepage</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        This is the protected home page for the SolveOnyx platform.
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
