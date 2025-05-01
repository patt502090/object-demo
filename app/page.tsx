"use client"

import type React from "react"

import { useState, useMemo, useEffect } from "react"
import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  ExternalLink,
  Search,
  FileType,
  Globe,
  Database,
  Package,
  Download,
  Eye,
  History,
  Copy,
  CheckCircle2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"

// Number of items per page
const ITEMS_PER_PAGE = 5

export default function Home() {
  const [address, setAddress] = useState("")
  const [inputAddress, setInputAddress] = useState("")
  const [objects, setObjects] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [copied, setCopied] = useState(false)

  const fetchObjects = async () => {
    if (!inputAddress) return

    setLoading(true)
    setError("")
    setObjects([])
    setAddress(inputAddress)
    setCurrentPage(1)
    setSearchTerm("")

    try {
      const client = new SuiClient({ url: getFullnodeUrl("mainnet") })

      // Get owned objects
      const { data } = await client.getOwnedObjects({
        owner: inputAddress,
        options: { showContent: true, showDisplay: true },
        limit: 50,
      })

      console.log("Fetched objects:", data)
      // console.log("Fetched objectxxs:", data[0].data.content.type)
      setObjects(data)
    } catch (err) {
      console.error(err)
      setError("Error fetching objects. Please check the address and try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchObjects()
  }

  // Helper function to determine if an object is a site
  const isSiteObject = (obj: any) => {
    if (!obj.data.content.type) return false
    return (
      obj.data.content.type.includes("::site::") ||
      obj.data.content.type.includes("::website::") ||
      obj.data.content.type.toLowerCase().includes("site")
    )
  }

  // Helper function to determine if an object is a blob
  const isBlobObject = (obj: any) => {
    if (!obj.data.content.type) return false
    console.log("obj.data.type", obj.data.content.type)
    return (
      obj.data.content.type.includes("::blob::") ||
      obj.data.content.type.includes("::file::") ||
      obj.data.content.type.includes("::image::") ||
      obj.data.content.type.toLowerCase().includes("blob")
    )
  }

  // Filter objects based on search term
  const filteredObjects = useMemo(() => {
    if (!searchTerm) return objects

    return objects.filter((obj) => {
      const objectId = obj.data.objectId.toLowerCase()
      const type = (obj.data.type || "").toLowerCase()
      const content = JSON.stringify(obj.data.content || {}).toLowerCase()
      const searchLower = searchTerm.toLowerCase()

      return objectId.includes(searchLower) || type.includes(searchLower) || content.includes(searchLower)
    })
  }, [objects, searchTerm])

  // Categorize objects by type
  const categorizedObjects = useMemo(() => {
    const siteObjects = filteredObjects.filter(isSiteObject)
    const blobObjects = filteredObjects.filter(isBlobObject)
    const otherObjects = filteredObjects.filter((obj) => !isSiteObject(obj) && !isBlobObject(obj))

    // Sort objects based on sortOrder
    const sortObjects = (objArray: any[]) => {
      return [...objArray].sort((a, b) => {
        if (sortOrder === "asc") {
          return a.data.objectId.localeCompare(b.data.objectId)
        } else {
          return b.data.objectId.localeCompare(a.data.objectId)
        }
      })
    }

    return {
      all: sortObjects(filteredObjects),
      site: sortObjects(siteObjects),
      blob: sortObjects(blobObjects),
      other: sortObjects(otherObjects),
    }
  }, [filteredObjects, sortOrder])

  // Get counts for each category
  const counts = useMemo(
    () => ({
      all: categorizedObjects.all.length,
      site: categorizedObjects.site.length,
      blob: categorizedObjects.blob.length,
      other: categorizedObjects.other.length,
    }),
    [categorizedObjects],
  )

  // Pagination
  const totalPages = useMemo(() => {
    const count = counts[activeTab as keyof typeof counts]
    return Math.ceil(count / ITEMS_PER_PAGE)
  }, [counts, activeTab])

  const paginatedObjects = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return categorizedObjects[activeTab as keyof typeof categorizedObjects].slice(startIndex, endIndex)
  }, [categorizedObjects, activeTab, currentPage])

  // Reset page when tab changes
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab])

  // Copy address to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({
      title: "Address copied",
      description: "The address has been copied to your clipboard",
    })
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl">Sui Object Explorer</CardTitle>
          <CardDescription>Enter a Sui address to view all objects owned by that address</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              placeholder="Enter Sui address (0x...)"
              value={inputAddress}
              onChange={(e) => setInputAddress(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={loading}>
              {loading ? "Loading..." : "Search"}
              {!loading && <Search className="ml-2 h-4 w-4" />}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && address && objects.length > 0 && (
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">Objects owned by:</h2>
              <div className="flex items-center gap-1">
                <span className="font-mono text-sm truncate max-w-[200px]">{address}</span>
                <button onClick={copyToClipboard} className="text-gray-500 hover:text-gray-700">
                  {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Input
                placeholder="Search objects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs"
              />
              <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as "asc" | "desc")}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">ID (A-Z)</SelectItem>
                  <SelectItem value="desc">ID (Z-A)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="all" className="flex items-center gap-1">
                <Package className="h-4 w-4" />
                All <Badge variant="outline">{counts.all}</Badge>
              </TabsTrigger>
              <TabsTrigger value="site" className="flex items-center gap-1">
                <Globe className="h-4 w-4" />
                Sites <Badge variant="outline">{counts.site}</Badge>
              </TabsTrigger>
              <TabsTrigger value="blob" className="flex items-center gap-1">
                <FileType className="h-4 w-4" />
                Blobs <Badge variant="outline">{counts.blob}</Badge>
              </TabsTrigger>
              <TabsTrigger value="other" className="flex items-center gap-1">
                <Database className="h-4 w-4" />
                Other <Badge variant="outline">{counts.other}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4 mt-0">
              {paginatedObjects.length > 0 ? (
                paginatedObjects.map((obj) => (
                  <ObjectCard
                    key={obj.data.objectId}
                    object={obj.data}
                    isSite={isSiteObject(obj)}
                    isBlob={isBlobObject(obj)}
                  />
                ))
              ) : (
                <Alert>
                  <AlertDescription>No objects found matching your search criteria.</AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="site" className="space-y-4 mt-0">
              {paginatedObjects.length > 0 ? (
                paginatedObjects.map((obj) => (
                  <ObjectCard key={obj.data.objectId} object={obj.data} isSite={true} isBlob={false} />
                ))
              ) : (
                <Alert>
                  <AlertDescription>No site objects found for this address.</AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="blob" className="space-y-4 mt-0">
              {paginatedObjects.length > 0 ? (
                paginatedObjects.map((obj) => (
                  <ObjectCard key={obj.data.objectId} object={obj.data} isSite={false} isBlob={true} />
                ))
              ) : (
                <Alert>
                  <AlertDescription>No blob objects found for this address.</AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="other" className="space-y-4 mt-0">
              {paginatedObjects.length > 0 ? (
                paginatedObjects.map((obj) => (
                  <ObjectCard key={obj.data.objectId} object={obj.data} isSite={false} isBlob={false} />
                ))
              ) : (
                <Alert>
                  <AlertDescription>No other objects found for this address.</AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination className="mt-4">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>

                {[...Array(totalPages)].map((_, i) => {
                  const pageNum = i + 1
                  // Show first page, current page, last page, and pages around current
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                  ) {
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink isActive={pageNum === currentPage} onClick={() => setCurrentPage(pageNum)}>
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  }
                  // Show ellipsis for gaps
                  if (pageNum === 2 || pageNum === totalPages - 1) {
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )
                  }
                  return null
                })}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}

      {!loading && address && objects.length === 0 && !error && (
        <Alert className="mb-6">
          <AlertDescription>No objects found for this address.</AlertDescription>
        </Alert>
      )}

      <Toaster />
    </main>
  )
}

function ObjectCard({ object, isSite, isBlob }: { object: any; isSite: boolean; isBlob: boolean }) {
  const objectId = object.objectId
  const type = object.type || "Unknown Type"
  const content = object.content
  const display = object.display
  const [copied, setCopied] = useState(false)

  // Copy object ID to clipboard
  const copyObjectId = () => {
    navigator.clipboard.writeText(objectId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({
      title: "Object ID copied",
      description: "The object ID has been copied to your clipboard",
    })
  }

  // Determine object category for badge
  const getObjectCategory = () => {
    if (isSite) {
      return { label: "Site", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" }
    } else if (isBlob) {
      return { label: "Blob", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" }
    } else {
      return { label: "Other", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" }
    }
  }

  const category = getObjectCategory()

  // Extract specific fields based on object type
  const getSpecificFields = () => {
    if (!content || !content.fields) return null

    if (isSite) {
      const { name, description, image_url, project_url } = content.fields
      return (
        <div className="mt-2 p-3 bg-green-50 dark:bg-green-950 rounded-md">
          <h4 className="font-medium">{name || "Unnamed Site"}</h4>
          {description && <p className="text-sm mt-1">{description}</p>}

          <div className="flex flex-wrap gap-2 mt-2">
            {project_url && (
              <a
                href={project_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs bg-green-200 dark:bg-green-800 px-2 py-1 rounded-md"
              >
                <Globe className="h-3 w-3 mr-1" /> Visit Site
              </a>
            )}

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs h-6">
                  <Eye className="h-3 w-3 mr-1" /> Preview
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>{name || "Site Preview"}</DialogTitle>
                  <DialogDescription>{description || "Preview of the site object"}</DialogDescription>
                </DialogHeader>
                <div className="mt-4">
                  {image_url ? (
                    <img
                      src={image_url || "/placeholder.svg"}
                      alt={name || "Site preview"}
                      className="w-full h-auto rounded-md"
                    />
                  ) : (
                    <div className="bg-muted h-64 flex items-center justify-center rounded-md">
                      No preview available
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )
    }

    if (isBlob) {
      const { size, blob_id, encoding_type } = content.fields
      return (
        <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Size:</div>
            <div className="font-mono">{size} bytes</div>
            {blob_id && (
              <>
                <div>Blob ID:</div>
                <div className="font-mono truncate">{blob_id}</div>
              </>
            )}
            {encoding_type !== undefined && (
              <>
                <div>Encoding:</div>
                <div className="font-mono">{encoding_type}</div>
              </>
            )}
          </div>

          <div className="mt-3">
            <Button variant="outline" size="sm" className="text-xs h-6">
              <Download className="h-3 w-3 mr-1" /> Download Blob
            </Button>
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="font-mono text-sm truncate max-w-[200px]">{objectId}</span>
              <button onClick={copyObjectId} className="text-gray-500 hover:text-gray-700">
                {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${category.color}`}>{category.label}</span>
          </CardTitle>
          <a
            href={`https://explorer.sui.io/object/${objectId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
        <CardDescription className="font-mono text-xs truncate">{type}</CardDescription>
      </CardHeader>
      <CardContent>
        {getSpecificFields()}

        <Tabs defaultValue="content" className="mt-4">
          <TabsList>
            <TabsTrigger value="content">Content</TabsTrigger>
            {display && <TabsTrigger value="display">Display</TabsTrigger>}
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="content" className="mt-2">
            <pre className="bg-muted p-4 rounded-md overflow-auto text-xs max-h-60">
              {JSON.stringify(content, null, 2)}
            </pre>
          </TabsContent>
          {display && (
            <TabsContent value="display" className="mt-2">
              <div className="bg-muted p-4 rounded-md">
                <h3 className="font-semibold mb-2">{display.name || "Unnamed Object"}</h3>
                {display.description && <p className="text-sm mb-2">{display.description}</p>}
                {display.image_url && (
                  <div className="mt-2">
                    <img
                      src={display.image_url || "/placeholder.svg"}
                      alt={display.name || "Object image"}
                      className="max-w-full h-auto max-h-40 rounded-md"
                    />
                  </div>
                )}
              </div>
            </TabsContent>
          )}
          <TabsContent value="history" className="mt-2">
            <div className="bg-muted p-4 rounded-md">
              <p className="text-sm text-center">
                Transaction history will be loaded here.
                <br />
                <Button variant="link" size="sm" className="mt-2">
                  <History className="h-4 w-4 mr-1" /> Load Transaction History
                </Button>
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-xs text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm">
            <History className="h-4 w-4 mr-1" /> History
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
