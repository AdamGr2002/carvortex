'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { ThumbsUp, ThumbsDown, RefreshCw, ArrowLeft } from 'lucide-react'
import { useUser } from "@clerk/nextjs"
import Link from 'next/link'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

interface Car {
  id: string
  imageUrl: string
  votes: number
  title: string
  description: string
  style: string
  environment: string
  userDisplayName: string
}

export default function TopCarsPage() {
  const [cars, setCars] = useState<Car[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [timeFilter, setTimeFilter] = useState('all')
  const { isSignedIn } = useUser()

  useEffect(() => {
    fetchTopCars()
  }, [timeFilter])

  const fetchTopCars = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/top-cars?timeFilter=${timeFilter}&limit=10`)
      if (!response.ok) {
        throw new Error('Failed to fetch top cars')
      }
      const data = await response.json()
      setCars(data)
    } catch (error) {
      console.error('Error fetching top cars:', error)
      toast.error('Failed to load top cars. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVote = async (id: string, voteType: 'up' | 'down') => {
    if (!isSignedIn) {
      toast.error('Please sign in to vote')
      return
    }

    try {
      const response = await fetch('/api/cars', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, vote: voteType }),
      })

      if (!response.ok) {
        throw new Error('Failed to vote')
      }

      const updatedCar = await response.json()
      setCars(cars.map(car => car.id === updatedCar.id ? updatedCar : car))
      toast.success('Vote recorded successfully!')
    } catch (error) {
      console.error('Error voting:', error)
      toast.error('Failed to vote. Please try again.')
    }
  }

  return (
    <div className="container mx-auto p-4">
      <ToastContainer position="bottom-right" />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Top Voted Cars</h1>
        <Link href="/">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Gallery
          </Button>
        </Link>
      </div>
      <div className="mb-4">
        <Select value={timeFilter} onValueChange={setTimeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="24h">Last 24 Hours</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cars.map((car) => (
            <Card key={car.id} className="overflow-hidden">
              <CardContent className="p-0">
                <img src={car.imageUrl} alt={car.title} className="w-full h-48 object-cover" />
              </CardContent>
              <CardFooter className="flex flex-col items-start p-4">
                <h2 className="text-lg font-semibold mb-2">{car.title}</h2>
                <p className="text-sm text-gray-500 mb-2">Votes: {car.votes}</p>
                <p className="text-xs text-gray-400 mb-2">Created by: {car.userDisplayName}</p>
                <p className="text-sm text-gray-600 mb-4">{car.description}</p>
                <div className="flex justify-between items-center w-full">
                  <div>
                    <p className="text-xs text-gray-500">Style: {car.style}</p>
                    <p className="text-xs text-gray-500">Environment: {car.environment}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" onClick={() => handleVote(car.id, 'up')} disabled={!isSignedIn}>
                      <ThumbsUp className="w-4 h-4" />
                    </Button>
                    <Button size="sm" onClick={() => handleVote(car.id, 'down')} disabled={!isSignedIn}>
                      <ThumbsDown className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}