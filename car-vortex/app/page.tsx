/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { ThumbsUp, ThumbsDown, RefreshCw, Trophy, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { useUser, SignInButton, UserButton, SignUpButton } from "@clerk/nextjs"
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

interface User {
  id: string
  email: string
  credits: number
}

export default function FutureCarsGallery() {
  const [cars, setCars] = useState<Car[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [prompt, setPrompt] = useState("A futuristic concept car")
  const [style, setStyle] = useState("realistic")
  const [environment, setEnvironment] = useState("city street")
  const { isSignedIn, user } = useUser()
  const [selectedCar, setSelectedCar] = useState<Car | null>(null)
  const [userData, setUserData] = useState<User | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchCars = useCallback(async (page: number) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/cars?page=${page}&limit=9`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setCars(data.cars)
      setTotalPages(data.totalPages)
      setCurrentPage(data.currentPage)
    } catch (error) {
      console.error('Error fetching cars:', error)
      setError('Failed to load cars. Please try again later.')
      toast.error('Failed to load cars. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchUserData = useCallback(async () => {
    try {
      const response = await fetch('/api/users')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setUserData(data)
    } catch (error) {
      console.error('Error fetching user data:', error)
      toast.error('Failed to load user data. Please try again.')
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    const fetchData = async () => {
      if (isMounted) {
        await fetchCars(currentPage)
        if (isSignedIn) {
          await fetchUserData()
        }
      }
    }
    fetchData()
    return () => {
      isMounted = false
    }
  }, [isSignedIn, currentPage, fetchCars, fetchUserData])

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
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const updatedCar = await response.json()
      setCars(cars.map(car => car.id === updatedCar.id ? updatedCar : car))
      toast.success('Vote recorded successfully!')
    } catch (error) {
      console.error('Error voting:', error)
      toast.error('Failed to vote. Please try again.')
    }
  }

  const handleGenerateNew = async () => {
    if (!userData || userData.credits < 1) {
      toast.error('You need more credits to generate a new car.')
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch('/api/generate-car', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, style, environment }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      const newCar = {
        imageUrl: data.imageUrl,
        title: data.title,
        description: data.description,
        style: style,
        environment: environment,
      }

      const carResponse = await fetch('/api/cars', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCar),
      })

      if (!carResponse.ok) {
        throw new Error(`HTTP error! status: ${carResponse.status}`)
      }

      const savedCar = await carResponse.json()
      setCars([savedCar, ...cars.slice(0, 8)])
      await fetch('/api/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credits: -1 }),
      })
      fetchUserData()
      toast.success('New car generated successfully!')
    } catch (error) {
      console.error('Error generating car:', error)
      toast.error('Failed to generate car. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const closeModal = () => {
    setSelectedCar(null)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-4">Error</h1>
        <p className="text-red-500">{error}</p>
        <Button onClick={() => fetchCars(currentPage)} className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <ToastContainer position="bottom-right" />
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">Futuristic AI Cars Gallery</h1>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/top-cars">
            <Button variant="outline">
              <Trophy className="w-4 h-4 mr-2" />
              Top Cars
            </Button>
          </Link>
          {isSignedIn ? (
            <>
              <div className="flex items-center gap-2">
                <span>Credits: {userData?.credits ?? 0}</span>
              </div>
              <UserButton afterSignOutUrl="/" />
            </>
          ) : (
            <div className="flex gap-2">
              <SignInButton mode="modal">
                <Button variant="outline">Sign In</Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button>Sign Up</Button>
              </SignUpButton>
            </div>
          )}
        </div>
      </div>
      {isSignedIn && (
        <div className="mb-4 flex flex-col gap-2">
          <Input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter a prompt for the AI car"
            className="flex-grow"
          />
          <div className="flex flex-wrap gap-2">
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realistic">Realistic</SelectItem>
                <SelectItem value="cartoon">Cartoon</SelectItem>
                <SelectItem value="cyberpunk">Cyberpunk</SelectItem>
                <SelectItem value="retro">Retro</SelectItem>
              </SelectContent>
            </Select>
            <Select value={environment} onValueChange={setEnvironment}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select environment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="city street">City Street</SelectItem>
                <SelectItem value="highway">Highway</SelectItem>
                <SelectItem value="futuristic cityscape">Futuristic Cityscape</SelectItem>
                <SelectItem value="nature">Nature</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleGenerateNew} disabled={isGenerating || !userData || userData.credits < 1} className="w-full sm:w-auto">
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate New Car (1 Credit)
                </>
              )}
            </Button>
          </div>
        </div>
      )}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cars.map((car) => (
            <Card key={car.id} className="overflow-hidden cursor-pointer" onClick={() => setSelectedCar(car)}>
              <CardContent className="p-0">
                <img src={car.imageUrl} alt={car.title} className="w-full h-48 object-cover" />
              </CardContent>
              <CardFooter className="flex justify-between items-center p-4">
                <div>
                  <h2 className="text-lg font-semibold">{car.title}</h2>
                  <p className="text-sm text-gray-500">Votes: {car.votes}</p>
                  <p className="text-xs text-gray-400">Created by: {car.userDisplayName}</p>
                </div>
                <div className="flex space-x-2">
                  <Button size="sm" onClick={(e) => { e.stopPropagation(); handleVote(car.id, 'up'); }} disabled={!isSignedIn}>
                    <ThumbsUp className="w-4 h-4" />
                  </Button>
                  <Button size="sm" onClick={(e) => { e.stopPropagation(); handleVote(car.id, 'down'); }} disabled={!isSignedIn}>
                    <ThumbsDown className="w-4 h-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      <div className="mt-8 flex justify-center items-center space-x-4">
        <Button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          variant="outline"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <span>Page {currentPage} of {totalPages}</span>
        <Button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          variant="outline"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
      {selectedCar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 flex justify-between items-center p-4 border-b bg-white z-10">
              <h2 className="text-xl sm:text-2xl font-bold truncate">{selectedCar.title}</h2>
              <Button variant="ghost" onClick={closeModal} className="shrink-0">
                <X className="w-6 h-6" />
              </Button>
            </div>
            <div className="p-4">
              <img src={selectedCar.imageUrl} alt={selectedCar.title} className="w-full h-auto rounded-lg" />
              <p className="mt-4 text-lg">Votes: {selectedCar.votes}</p>
              <p className="mt-2 text-gray-600">{selectedCar.description}</p>
              <p className="mt-2 text-sm text-gray-500">Style: {selectedCar.style}</p>
              <p className="mt-1 text-sm text-gray-500">Environment: {selectedCar.environment}</p>
              <p className="mt-1 text-sm text-gray-500">Created by: {selectedCar.userDisplayName}</p>
            </div>
            <div className="sticky bottom-0 flex justify-end p-4 border-t bg-white">
              <Button variant="outline" onClick={closeModal}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}