'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from 'react-toastify'

interface Car {
  id: string
  imageUrl: string
  title: string
}

const filters = {
  none: 'none',
  invert: 'invert(100%)',
  sepia: 'sepia(100%)',
  grayscale: 'grayscale(100%)',
  blur: 'blur(5px)',
  brightness: 'brightness(150%)',
  contrast: 'contrast(200%)',
}

export default function CustomizeCar() {
  const { id } = useParams()
  const [car, setCar] = useState<Car | null>(null)
  const [filter, setFilter] = useState('none')

  useEffect(() => {
    fetchCar()
  }, [])

  const fetchCar = async () => {
    try {
      const response = await fetch(`/api/cars/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch car')
      }
      const data = await response.json()
      setCar(data)
    } catch (error) {
      console.error('Error fetching car:', error)
      toast.error('Failed to fetch car details')
    }
  }

  const saveCar = async () => {
    // Here you would typically save the customized image
    // For this example, we'll just show a toast notification
    toast.success('Car customization saved!')
  }

  if (!car) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Customize Car: {car.title}</h1>
      <div className="mb-4">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select filter" />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(filters).map((filterName) => (
              <SelectItem key={filterName} value={filterName}>
                {filterName.charAt(0).toUpperCase() + filterName.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="mb-4">
        <img 
          src={car.imageUrl} 
          alt={car.title} 
          className="w-full h-auto max-w-2xl mx-auto"
          style={{ filter: filters[filter as keyof typeof filters] }}
        />
      </div>
      <div className="flex justify-center">
        <Button onClick={saveCar}>Save Customization</Button>
      </div>
    </div>
  )
}