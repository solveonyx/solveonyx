"use client"

import { useEffect, useMemo, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchProductHierarchy } from "@/services/productHierarchyService"
import { fetchProducts } from "@/services/productService"
import { Product } from "@/types"
import { ProductLineWithModels } from "@/types/productHierarchy"

export default function ProductHierarchyPage() {
    const [products, setProducts] = useState<Product[]>([])
    const [selectedProductId, setSelectedProductId] = useState("")
    const [hierarchy, setHierarchy] = useState<ProductLineWithModels[]>([])
    const [isLoadingProducts, setIsLoadingProducts] = useState(true)
    const [isLoadingHierarchy, setIsLoadingHierarchy] = useState(false)
    const [errorMessage, setErrorMessage] = useState("")

    const sortedProducts = useMemo(
        () =>
            [...products].sort((a, b) => {
                if (a.displayOrder !== b.displayOrder) {
                    return a.displayOrder - b.displayOrder
                }

                return a.id.localeCompare(b.id)
            }),
        [products]
    )

    const sortedHierarchy = useMemo(
        () =>
            [...hierarchy]
                .sort((a, b) => {
                    if (a.displayOrder !== b.displayOrder) {
                        return a.displayOrder - b.displayOrder
                    }

                    return a.id.localeCompare(b.id)
                })
                .map((line) => ({
                    ...line,
                    models: [...line.models].sort((a, b) => {
                        if (a.displayOrder !== b.displayOrder) {
                            return a.displayOrder - b.displayOrder
                        }

                        return a.id.localeCompare(b.id)
                    })
                })),
        [hierarchy]
    )

    useEffect(() => {
        const loadProducts = async () => {
            try {
                const data = await fetchProducts()
                setProducts(data)
                if (data.length > 0) {
                    setSelectedProductId(data[0].id)
                }
            } catch (error) {
                console.error("Failed to load products:", error)
                setErrorMessage("Could not load products.")
            } finally {
                setIsLoadingProducts(false)
            }
        }

        loadProducts()
    }, [])

    useEffect(() => {
        const loadHierarchy = async () => {
            if (!selectedProductId) {
                setHierarchy([])
                return
            }

            setIsLoadingHierarchy(true)
            setErrorMessage("")

            try {
                const rows = await fetchProductHierarchy(selectedProductId)
                setHierarchy(rows)
            } catch (error) {
                console.error("Failed to load product hierarchy:", error)
                setErrorMessage("Could not load product hierarchy.")
            } finally {
                setIsLoadingHierarchy(false)
            }
        }

        loadHierarchy()
    }, [selectedProductId])

    return (
        <div className="w-full space-y-5 p-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Product Hierarchy</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Review product lines and models in their display order.
                </p>
            </div>

            <div>
                <Select
                    value={selectedProductId}
                    onValueChange={setSelectedProductId}
                    disabled={isLoadingProducts || products.length === 0}
                >
                    <SelectTrigger id="productId" className="w-full min-w-[220px] sm:w-1/3">
                        <SelectValue placeholder="Select a product" />
                    </SelectTrigger>
                    <SelectContent position="popper" align="start">
                        {sortedProducts.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                                {product.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {!selectedProductId && !isLoadingProducts && (
                <Alert>
                    <AlertTitle>No products found</AlertTitle>
                    <AlertDescription>Create a product before reviewing its hierarchy.</AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Hierarchy</CardTitle>
                    <CardDescription>Product lines are shown with their nested models.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingHierarchy && (
                        <div className="space-y-3">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-4/5" />
                            <Skeleton className="h-12 w-3/5" />
                        </div>
                    )}

                    {!isLoadingHierarchy && sortedHierarchy.length > 0 && (
                        <div className="space-y-4">
                            {sortedHierarchy.map((line, index) => (
                                <div key={line.id} className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="font-medium">{line.name}</div>
                                        <Badge variant="secondary">{line.models.length} models</Badge>
                                    </div>

                                    {line.models.length > 0 && (
                                        <div className="ml-4 space-y-2 pl-4">
                                            {line.models.map((model) => (
                                                <div key={model.id} className="text-sm text-muted-foreground">
                                                    {model.name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {index < sortedHierarchy.length - 1 && <Separator />}
                                </div>
                            ))}
                        </div>
                    )}

                    {!isLoadingHierarchy && selectedProductId && hierarchy.length === 0 && (
                        <p className="text-sm text-muted-foreground">No product lines found for this product.</p>
                    )}
                </CardContent>
            </Card>

            {errorMessage && (
                <Alert variant="destructive">
                    <AlertTitle>Product hierarchy issue</AlertTitle>
                    <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
            )}
        </div>
    )
}
