import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminHomePage() {
    return (
        <div className="flex min-h-screen w-full items-center p-6">
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="text-2xl">SolveOnyx CX Admin</CardTitle>
                    <CardDescription>Jump into the tools that maintain product and configuration data.</CardDescription>
                </CardHeader>
            </Card>
        </div>
    )
}
