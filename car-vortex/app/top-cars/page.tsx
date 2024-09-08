'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft } from 'lucide-react'

interface TopCar {
  id: string
  imageUrl: string
  title: string
  votes: number
  userDisplayName: string
}

export default function TopCars() {
  const [topCars, setTopCars] = useState<TopCar[]>([])
  const [timeRange, setTimeRange] = useState('allTime')

  useEffect(() => {
    fetchTopCars()
  }, [timeRange])

  const fetchTopCars = async () => {
    try {
      const response = await fetch(`/api/top-cars?timeRange=${timeRange}`)
      if (!response.ok) {
        throw new Error('Failed to fetch top cars')
      }
      const data = await response.json()
      setTopCars(data)
    } catch (error) {
      console.error('Error fetching top cars:', error)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Top Voted Cars</h1>
        <Link href="/">
          <Button variant="outline">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Gallery
          </Button>
        </Link>
      </div>
      <Select value={timeRange} onValueChange={setTimeRange}>
        <SelectTrigger className="w-[180px] mb-4">
          <SelectValue placeholder="Select time range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="day">Last 24 hours</SelectItem>
          <SelectItem value="week">Last 7 days</SelectItem>
          <SelectItem value="month">Last 30 days</SelectItem>
          <SelectItem value="allTime">All time</SelectItem>
        </SelectContent>
      </Select>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {topCars.map((car) => (
          <Card key={car.id}>
            <CardContent className="p-0">
              <img src={car.imageUrl} alt={car.title} className="w-full h-48 object-cover" />
            </CardContent>
            <CardFooter className="flex justify-between items-center p-4">
              <div>
                <h2 className="text-lg font-semibold">{car.title}</h2>
                <p className="text-sm text-gray-500">Votes: {car.votes}</p>
                <p className="text-xs text-gray-400">Created by: {car.userDisplayName}</p>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}