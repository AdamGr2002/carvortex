'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Heart, Share2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

type Car = {
  id: string
  title: string
  imageUrl: string
  likes: number
}

type Collection = {
  id: string
  title: string
  description: string
  cars: Car[]
}

export default function ThemedCollections() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [activeCollection, setActiveCollection] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCollections()
  }, [])

  const fetchCollections = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/collections')
      if (!response.ok) {
        throw new Error('Failed to fetch collections')
      }
      const data = await response.json()
      setCollections(data)
      setActiveCollection(data[0]?.id || '')
    } catch (err) {
      setError('Failed to load collections. Please try again later.')
      console.error('Error fetching collections:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLike = async (carId: string) => {
    try {
      const response = await fetch(`/api/cars/${carId}/like`, { method: 'POST' })
      if (!response.ok) {
        throw new Error('Failed to like car')
      }
      const updatedCar = await response.json()
      setCollections(collections.map(collection => ({
        ...collection,
        cars: collection.cars.map(car => car.id === carId ? updatedCar : car)
      })))
      toast.success('Car liked successfully!')
    } catch (err) {
      toast.error('Failed to like car. Please try again.')
      console.error('Error liking car:', err)
    }
  }

  const handleShare = async (carId: string) => {
    try {
      const response = await fetch(`/api/cars/${carId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch car details')
      }
      const carData = await response.json()
      const shareUrl = `${window.location.origin}/cars/${carId}`
      await navigator.share({
        title: carData.title,
        text: `Check out this amazing car design: ${carData.title}`,
        url: shareUrl,
      })
      toast.success('Car shared successfully!')
    } catch (err) {
      toast.error('Failed to share car. Please try again.')
      console.error('Error sharing car:', err)
    }
  }

  if (isLoading) {
    return <div className="text-center py-10">Loading collections...</div>
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">{error}</div>
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Themed Collections</h1>
      <Tabs value={activeCollection} onValueChange={setActiveCollection}>
        <TabsList className="grid w-full grid-cols-3">
          {collections.map((collection) => (
            <TabsTrigger key={collection.id} value={collection.id}>
              {collection.title}
            </TabsTrigger>
          ))}
        </TabsList>
        {collections.map((collection) => (
          <TabsContent key={collection.id} value={collection.id}>
            <Card>
              <CardHeader>
                <CardTitle>{collection.title}</CardTitle>
                <CardDescription>{collection.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] w-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {collection.cars.map((car) => (
                      <Card key={car.id}>
                        <CardContent className="p-0">
                          <img src={car.imageUrl} alt={car.title} className="w-full h-40 object-cover" />
                        </CardContent>
                        <CardFooter className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold">{car.title}</p>
                            <p className="text-sm text-gray-500">{car.likes} likes</p>
                          </div>
                          <div className="flex space-x-2">
                            <Button size="icon" variant="ghost" onClick={() => handleLike(car.id)}>
                              <Heart className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleShare(car.id)}>
                              <Share2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}