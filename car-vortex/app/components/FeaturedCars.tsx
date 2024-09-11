'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Heart } from "lucide-react"
import { useAuth } from '@clerk/nextjs'
import { toast } from 'react-hot-toast'

interface Car {
  id: string
  title: string
  imageUrl: string
  likes: number
  user: {
    name: string
  }
}

export default function FeaturedCars() {
  const [cars, setCars] = useState<Car[]>([])
  const [loading, setLoading] = useState(true)
  const [likedCars, setLikedCars] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const { isSignedIn } = useAuth()

  useEffect(() => {
    fetchCars()
  }, [currentPage])

  const fetchCars = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/featured-cars?limit=10&page=${currentPage}`)
      if (!response.ok) {
        throw new Error('Failed to fetch cars')
      }
      const data = await response.json()
      setCars(data.cars)
      setTotalPages(data.totalPages)
    } catch (error) {
      console.error('Error fetching cars:', error)
      toast.error('Failed to load cars')
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async (carId: string) => {
    if (!isSignedIn) {
      toast.error('Please sign in to like cars')
      return
    }

    try {
      // Optimistic update
      setLikedCars((prev) => {
        const newSet = new Set(prev)
        if (newSet.has(carId)) {
          newSet.delete(carId)
        } else {
          newSet.add(carId)
        }
        return newSet
      })

      setCars((prev) =>
        prev.map((car) =>
          car.id === carId
            ? { ...car, likes: likedCars.has(carId) ? car.likes - 1 : car.likes + 1 }
            : car
        )
      )

      const response = await fetch(`/car-design/${carId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to process like')
      }

      const data = await response.json()

      // Update the likes count with the actual value from the server
      setCars((prev) =>
        prev.map((car) =>
          car.id === carId ? { ...car, likes: data.likes } : car
        )
      )

      // Update the liked state based on the server response
      setLikedCars((prev) => {
        const newSet = new Set(prev)
        if (data.liked) {
          newSet.add(carId)
        } else {
          newSet.delete(carId)
        }
        return newSet
      })

      toast.success(data.liked ? 'Car liked!' : 'Like removed')

    } catch (error) {
      console.error('Error liking car:', error)
      toast.error('Failed to like car')
      // Revert the optimistic update
      setLikedCars((prev) => {
        const newSet = new Set(prev)
        if (newSet.has(carId)) {
          newSet.delete(carId)
        } else {
          newSet.add(carId)
        }
        return newSet
      })
      setCars((prev) =>
        prev.map((car) =>
          car.id === carId
            ? { ...car, likes: likedCars.has(carId) ? car.likes + 1 : car.likes - 1 }
            : car
        )
      )
    }
  }

  if (loading && cars.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {cars.map((car) => (
          <Card key={car.id} className="overflow-hidden">
            <CardContent className="p-0">
              <Image
                src={car.imageUrl}
                alt={car.title}
                width={300}
                height={200}
                layout="responsive"
                objectFit="cover"
              />
            </CardContent>
            <CardFooter className="flex justify-between items-center p-4">
              <div>
                <h3 className="font-semibold">{car.title}</h3>
                <p className="text-sm text-gray-500">by {car.user.name}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleLike(car.id)}
                disabled={!isSignedIn}
              >
                <Heart className={`h-5 w-5 ${likedCars.has(car.id) ? 'fill-current text-red-500' : ''}`} />
                <span className="ml-1">{car.likes}</span>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      <div className="flex justify-center mt-4 space-x-2">
        <Button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1 || loading}
        >
          Previous
        </Button>
        <Button
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages || loading}
        >
          Next
        </Button>
      </div>
    </div>
  )
}