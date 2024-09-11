/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useUser, SignInButton, UserButton } from "@clerk/nextjs"
import { motion } from "framer-motion"
import { toast } from 'react-hot-toast'
import { ThumbsUp } from 'lucide-react'
import InfiniteScroll from 'react-infinite-scroll-component'
import ThemedCollections from './components/themed-collection'
import CommunityFeed from './components/community-feed'

interface Car {
  id: string
  imageUrl: string
  title: string
  voteCount: number
  hasVoted: boolean
}

export default function Home() {
  const [featuredCars, setFeaturedCars] = useState<Car[]>([])
  const [credits, setCredits] = useState<number | null>(null)
  const [isLoadingCredits, setIsLoadingCredits] = useState(false)
  const [isLoadingCars, setIsLoadingCars] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const { isSignedIn, user } = useUser()

  const fetchFeaturedCars = useCallback(async () => {
    if (isLoadingCars || !hasMore) return;
    setIsLoadingCars(true);
    try {
      const response = await fetch(`/api/featured-cars${nextCursor ? `?cursor=${nextCursor}` : ''}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch featured cars: ${response.status} ${response.statusText}`)
      }
      const data = await response.json()
      if (data && Array.isArray(data.cars)) {
        if (data.cars.length === 0) {
          setHasMore(false)
        } else {
          setFeaturedCars(prev => [...prev, ...data.cars])
          setNextCursor(data.nextCursor)
          setHasMore(!!data.nextCursor)
        }
      } else {
        console.error('Unexpected data structure:', data)
        toast.error('Failed to load featured cars: Unexpected data structure')
        setHasMore(false)
      }
    } catch (error) {
      console.error('Error fetching featured cars:', error)
      toast.error('Failed to load featured cars')
      setHasMore(false)
    } finally {
      setIsLoadingCars(false)
    }
  }, [nextCursor, isLoadingCars, hasMore])

  useEffect(() => {
    fetchFeaturedCars()
  }, [fetchFeaturedCars])

  useEffect(() => {
    const fetchCredits = async () => {
      if (isSignedIn) {
        setIsLoadingCredits(true)
        try {
          const response = await fetch('/api/credits')
          if (!response.ok) {
            throw new Error(`Failed to fetch credits: ${response.status} ${response.statusText}`)
          }
          const data = await response.json()
          setCredits(data.credits)
        } catch (error) {
          console.error('Error fetching credits:', error)
          toast.error('Failed to load credits. Please try again.')
        } finally {
          setIsLoadingCredits(false)
        }
      }
    }

    fetchCredits()
  }, [isSignedIn])

  const handleCreateCar = () => {
    if (!isSignedIn) {
      toast.error('Please sign in to create a car')
      return
    }

    if (credits !== null && credits < 1) {
      toast.error('Not enough credits to create a car')
      return
    }
  }

  const handleVote = async (carId: string) => {
    if (!isSignedIn) {
      toast.error('Please sign in to vote')
      return
    }

    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ carId }),
      })

      if (!response.ok) {
        throw new Error('Failed to vote')
      }

      const data = await response.json()

      setFeaturedCars(cars =>
        cars.map(car =>
          car.id === carId
            ? { 
                ...car, 
                voteCount: data.action === 'added' ? car.voteCount + 1 : car.voteCount - 1, 
                hasVoted: data.action === 'added'
              }
            : car
        )
      )

      toast.success(data.message)
    } catch (error) {
      console.error('Error voting:', error)
      toast.error('Failed to vote. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <header className="container mx-auto py-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold">CarVortex AI</h1>
        <div className="flex items-center space-x-4">
          {isSignedIn && (
            <div className="bg-gray-700 px-3 py-1 rounded-full text-sm">
              Credits: {isLoadingCredits ? 'Loading...' : (credits !== null ? credits : 'Error')}
            </div>
          )}
          {isSignedIn ? (
            <UserButton afterSignOutUrl="/" />
          ) : (
            <SignInButton mode="modal">
              <Button>Sign In</Button>
            </SignInButton>
          )}
        </div>
      </header>

      <main className="container mx-auto mt-12">
        <section className="text-center">
          <h2 className="text-5xl font-bold mb-4">Create Your Dream Car with AI</h2>
          <p className="text-xl mb-8">Design futuristic, unique vehicles in seconds</p>
          {isSignedIn ? (
            <Link href="/create">
              <Button 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleCreateCar}
                disabled={isLoadingCredits || (credits !== null && credits < 1)}
              >
                {isLoadingCredits ? 'Loading...' : (credits !== null && credits < 1 ? 'Not Enough Credits' : 'Start Creating')}
              </Button>
            </Link>
          ) : (
            <SignInButton mode="modal">
              <Button 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700"
              >
                Sign In to Create
              </Button>
            </SignInButton>
          )}
        </section>

        <section className="mt-16">
          <h3 className="text-3xl font-bold mb-6">Featured Designs</h3>
          <InfiniteScroll
            dataLength={featuredCars.length}
            next={fetchFeaturedCars}
            hasMore={hasMore}
            loader={<h4>Loading...</h4>}
            endMessage={
              <p style={{ textAlign: 'center' }}>
                <b>You have seen all the featured cars!</b>
              </p>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredCars.map((car, index) => (
                <motion.div
                  key={car.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="overflow-hidden bg-gray-800 border-gray-700">
                    <CardContent className="p-0">
                      <img src={car.imageUrl} alt={car.title} className="w-full h-48 object-cover" />
                      <div className="p-4">
                        <h4 className="text-lg font-semibold">{car.title}</h4>
                        <div className="flex justify-between items-center mt-2">
                          <span>{car.voteCount} votes</span>
                          <Button
                            size="sm"
                            variant={car.hasVoted ? "secondary" : "outline"}
                            onClick={() => handleVote(car.id)}
                          >
                            <ThumbsUp className="mr-2 h-4 w-4" />
                            {car.hasVoted ? 'Voted' : 'Vote'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </InfiniteScroll>
        </section>

        <section className="mt-16">
          <ThemedCollections />
        </section>

        <section className="mt-16">
          <CommunityFeed />
        </section>
      </main>
    </div>
  )
}