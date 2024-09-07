'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { ThumbsUp } from 'lucide-react'
import Link from 'next/link'

interface Car {
  id: number
  imageUrl: string
  votes: number
  title: string
}

export default function TopCarsPage() {
  const [cars, setCars] = useState<Car[]>([])
  const [period, setPeriod] = useState<'all' | '24h' | '7d' | '30d'>('all')

  useEffect(() => {
    fetchCars()
  }, [period])

  const fetchCars = async () => {
    const response = await fetch(`/api/cars?period=${period}`)
    const data = await response.json()
    setCars(data)
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Top Voted Futuristic Cars</h1>
        <Link href="/">
          <Button variant="outline">Back to Gallery</Button>
        </Link>
      </div>

      <div className="mb-4 flex gap-2">
        <Button onClick={() => setPeriod('all')} variant={period === 'all' ? 'default' : 'outline'}>All Time</Button>
        <Button onClick={() => setPeriod('24h')} variant={period === '24h' ? 'default' : 'outline'}>Last 24 Hours</Button>
        <Button onClick={() => setPeriod('7d')} variant={period === '7d' ? 'default' : 'outline'}>Last 7 Days</Button>
        <Button onClick={() => setPeriod('30d')} variant={period === '30d' ? 'default' : 'outline'}>Last 30 Days</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cars.map((car, index) => (
          <Card key={car.id} className="overflow-hidden">
            <CardContent className="p-0 relative">
              <img src={car.imageUrl} alt={car.title} className="w-full h-48 object-cover" />
              <div className="absolute top-0 left-0 bg-primary text-primary-foreground px-2 py-1 text-sm font-bold">
                #{index + 1}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center p-4">
              <div>
                <h2 className="text-lg font-semibold">{car.title}</h2>
                <p className="text-sm text-gray-500 flex items-center">
                  <ThumbsUp className="w-4 h-4 mr-1" /> {car.votes} votes
                </p>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}