'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface FavoriteCar {
  id: string
  car: {
    id: string
    imageUrl: string
    title: string
  }
}

export default function Profile() {
  const { user } = useUser()
  const [favorites, setFavorites] = useState<FavoriteCar[]>([])

  useEffect(() => {
    fetchFavorites()
  }, [])

  const fetchFavorites = async () => {
    try {
      const response = await fetch('/api/favorites')
      if (!response.ok) {
        throw new Error('Failed to fetch favorites')
      }
      const data = await response.json()
      setFavorites(data)
    } catch (error) {
      console.error('Error fetching favorites:', error)
    }
  }

  const removeFavorite = async (carId: string) => {
    try {
      const response = await fetch('/api/favorites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carId }),
      })
      if (!response.ok) {
        throw new Error('Failed to remove favorite')
      }
      fetchFavorites()
    } catch (error) {
      console.error('Error removing favorite:', error)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">My Profile</h1>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">User Information</h2>
        <p>Email: {user?.primaryEmailAddress?.emailAddress}</p>
        <p>Username: {user?.username}</p>
      </div>
      <div>
        <h2 className="text-2xl font-semibold mb-4">My Favorite Cars</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((favorite) => (
            <Card key={favorite.id}>
              <CardContent className="p-0">
                <img src={favorite.car.imageUrl} alt={favorite.car.title} className="w-full h-48 object-cover" />
              </CardContent>
              <CardFooter className="flex justify-between items-center p-4">
                <h3 className="text-lg font-semibold">{favorite.car.title}</h3>
                <Button variant="outline" onClick={() => removeFavorite(favorite.car.id)}>
                  Remove
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}