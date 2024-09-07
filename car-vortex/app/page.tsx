/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { ThumbsUp, ThumbsDown, RefreshCw, Trophy, X, Download } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { useUser, SignInButton, UserButton, SignUpButton } from "@clerk/nextjs"
import Link from 'next/link'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
export const dynamic = 'force-dynamic'
interface Car {
  id: string
  imageUrl: string
  votes: number
  title: string
  description: string
  style: string
  environment: string
}

interface User {
  id: string
  email: string
  credits: number
}

export default function FutureCarsGallery() {
  const [cars, setCars] = useState<Car[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [prompt, setPrompt] = useState("A futuristic concept car")
  const [style, setStyle] = useState("realistic")
  const [environment, setEnvironment] = useState("city street")
  const { isSignedIn, user } = useUser()
  const [selectedCar, setSelectedCar] = useState<Car | null>(null)
  const [userData, setUserData] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCars()
    if (isSignedIn) {
      fetchUserData()
    }
  }, [isSignedIn])

  const fetchCars = async () => {
    try {
      const response = await fetch('/api/cars')
      if (!response.ok) {
        throw new Error('Failed to fetch cars')
      }
      const data = await response.json()
      if (Array.isArray(data)) {
        setCars(data)
      } else {
        console.error('Fetched data is not an array:', data)
        setCars([])
      }
    } catch (error) {
      console.error('Error fetching cars:', error)
      setError('Failed to load cars. Please try again later.')
      setCars([])
    }
  }

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/users')
      if (!response.ok) {
        throw new Error('Failed to fetch user data')
      }
      const data = await response.json()
      setUserData(data)
    } catch (error) {
      console.error('Error fetching user data:', error)
      setError('Failed to load user data. Please try again later.')
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

  const handleGenerateNew = async () => {
    if (!userData || userData.credits < 1) {
      toast.error('You need more credits to generate a new car.')
      return
    }

    setIsGenerating(true)
    setError(null)
    try {
      const response = await fetch('/api/generate-car', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, style, environment }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate image')
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
        throw new Error('Failed to save new car')
      }

      const savedCar = await carResponse.json()
      setCars(prevCars => [...prevCars, savedCar])

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
      setError('Failed to generate car. Please try again.')
      toast.error('Failed to generate car. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const closeModal = () => {
    setSelectedCar(null)
  }

  const handleDownload = async (imageUrl: string, title: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${title.replace(/\s+/g, '_')}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('Image downloaded successfully!')
    } catch (error) {
      console.error('Error downloading image:', error)
      toast.error('Failed to download image. Please try again.')
    }
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
                <span>Credits: {userData?.credits ?? 'Loading...'}</span>
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
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}
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
              <p className="mt-4 text-lg text-red-500">Votes: {selectedCar.votes}</p>
              <p className="mt-2 text-black">{selectedCar.description}</p>
              <p className="mt-2 text-sm text-black">Style: {selectedCar.style}</p>
              <p className="mt-1 text-sm text-black">Environment: {selectedCar.environment}</p>
            </div>
            <div className="sticky bottom-0 flex justify-end p-4 border-t bg-white">
              <Button variant="outline" onClick={() => handleDownload(selectedCar.imageUrl, selectedCar.title)} className="mr-2 bg-black">
                <Download className="w-4 h-4 mr-2 " />
                Download Image
              </Button>
              <Button variant="outline" onClick={closeModal} className='bg-black'>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}