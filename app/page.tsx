import Image from "next/image"

export default function Page() {
    return (
        <div className="flex min-h-screen items-center justify-center p-6">
            <div className="mx-auto flex w-full max-w-4xl items-center justify-center">
                <Image
                    src="/assets/logos/solveonyx_logo.png"
                    alt="SolveOnyx"
                    width={1200}
                    height={320}
                    className="h-auto w-full max-w-2xl opacity-15"
                    priority
                />
            </div>
        </div>
    )
}
