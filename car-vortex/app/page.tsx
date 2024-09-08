/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useUser, SignInButton, UserButton } from "@clerk/nextjs"
import { motion } from "framer-motion"
import { toast } from 'react-toastify'

interface Car {
  id: string
  imageUrl: string
  title: string
}

export default function Home() {
  const [featuredCars, setFeaturedCars] = useState<Car[]>([])
  const [credits, setCredits] = useState<number | null>(null)
  const { isSignedIn, user } = useUser()

  useEffect(() => {
    const fetchFeaturedCars = async () => {
      try {
        const response = await fetch('/api/featured-cars')
        if (!response.ok) {
          throw new Error('Failed to fetch featured cars')
        }
        const data = await response.json()
        setFeaturedCars(data)
      } catch (error) {
        console.error('Error fetching featured cars:', error)
        toast.error('Failed to load featured cars')
      }
    }

    const fetchCredits = async () => {
      if (isSignedIn) {
        try {
          const response = await fetch('/api/credits')
          if (!response.ok) {
            throw new Error('Failed to fetch credits')
          }
          const data = await response.json()
          setCredits(data.credits)
        } catch (error) {
          console.error('Error fetching credits:', error)
          toast.error('Failed to load credits')
        }
      }
    }

    fetchFeaturedCars()
    fetchCredits()
  }, [isSignedIn])

  const handleCreateCar = async () => {
    if (!isSignedIn) {
      toast.error('Please sign in to create a car')
      return
    }

    if (credits !== null && credits < 1) {
      toast.error('Not enough credits to create a car')
      return
    }

    // Navigate to create page or open create modal
    // This is a placeholder for the actual car creation logic
    toast.info('Navigating to car creation...')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <header className="container mx-auto py-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold">CarVortex AI</h1>
        <div className="flex items-center space-x-4">
          {isSignedIn && credits !== null && (
            <span className="text-sm">Credits: {credits}</span>
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
          <Button 
            size="lg" 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={handleCreateCar}
          >
            Start Creating
          </Button>
        </section>

        <section className="mt-16">
          <h3 className="text-3xl font-bold mb-6">Featured Designs</h3>
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
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}