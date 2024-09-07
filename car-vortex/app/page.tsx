/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { ThumbsUp, ThumbsDown, RefreshCw, Trophy, X, DollarSign } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { useUser, SignInButton, UserButton, SignUpButton } from "@clerk/nextjs"
import Link from 'next/link'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface Car {
  id: number
  imageUrl: string
  votes: number
  title: string
  description: string
  style: string
  environment: string
}

export default function FutureCarsGallery() {
  const [cars, setCars] = useState<Car[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [prompt, setPrompt] = useState("A futuristic concept car")
  const [style, setStyle] = useState("realistic")
  const [environment, setEnvironment] = useState("city street")
  const { isSignedIn, user } = useUser()
  const [selectedCar, setSelectedCar] = useState<Car | null>(null)
  const [credits, setCredits] = useState(0)

  useEffect(() => {
    const storedCars = localStorage.getItem('cars')
    if (storedCars) {
      setCars(JSON.parse(storedCars))
    } else {
      fetchCars()
    }

    if (isSignedIn) {
      const storedCredits = localStorage.getItem('credits')
      if (storedCredits) {
        setCredits(JSON.parse(storedCredits))
      } else {
        fetchCredits()
      }
    }
  }, [isSignedIn])

  useEffect(() => {
    localStorage.setItem('cars', JSON.stringify(cars))
  }, [cars])

  useEffect(() => {
    if (isSignedIn) {
      localStorage.setItem('credits', JSON.stringify(credits))
    }
  }, [credits, isSignedIn])

  const fetchCars = async () => {
    const response = await fetch('/api/cars')
    const data = await response.json()
    setCars(data)
  }

  const fetchCredits = async () => {
    const response = await fetch('/api/credits')
    const data = await response.json()
    setCredits(data.credits)
  }

  const handleVote = async (id: number, voteType: 'up' | 'down') => {
    if (!isSignedIn) {
      alert('Please sign in to vote')
      return
    }

    const response = await fetch('/api/cars', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, vote: voteType }),
    })

    if (response.ok) {
      const updatedCar = await response.json()
      setCars(cars.map(car => car.id === updatedCar.id ? updatedCar : car))
    } else {
      const error = await response.json()
      alert(error.error)
    }
  }

  const handleGenerateNew = async () => {
    if (credits < 1) {
      alert('You need to purchase more credits to generate a new car.')
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
        throw new Error('Failed to generate image')
      }

      const data = await response.json()

      const newCar: Car = {
        id: Date.now(),
        imageUrl: data.imageUrl,
        votes: 0,
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

      if (carResponse.ok) {
        const savedCar = await carResponse.json()
        setCars([...cars, savedCar])
        setCredits(credits - 1)
      }
    } catch (error) {
      console.error('Error generating car:', error)
      alert('Failed to generate car. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleBuyCredits = async () => {
    const stripe = await stripePromise
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount: 100 }), // $1.00 for 1 credit
    })

    const session = await response.json()
    const result = await stripe!.redirectToCheckout({
      sessionId: session.id,
    })

    if (result.error) {
      alert(result.error.message)
    }
  }

  const closeModal = () => {
    setSelectedCar(null)
  }

  return (
    <div className="container mx-auto p-4">
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
                <span>Credits: {credits}</span>
                <Button onClick={handleBuyCredits} variant="outline">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Buy Credits
                </Button>
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
          <Button onClick={handleGenerateNew} disabled={isGenerating || credits < 1} className="w-full sm:w-auto">
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
              <p className="mt-4 text-lg">Votes: {selectedCar.votes}</p>
              <p className="mt-2 text-gray-600">{selectedCar.description}</p>
              <p className="mt-2 text-sm text-gray-500">Style: {selectedCar.style}</p>
              <p className="mt-1 text-sm text-gray-500">Environment: {selectedCar.environment}</p>
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