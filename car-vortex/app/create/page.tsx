/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useState, useEffect,useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { toast } from 'react-hot-toast'
import { Loader2 } from "lucide-react"

interface Collection {
  id: string
  title: string
}

interface CarData {
  type: string
  style: string
  bodyColor: string
  wheelSize: number
  spoiler: boolean
  lowered: boolean
  backgroundScene: string
  timeOfDay: string
  collectionId: string
  additionalDetails: string
}

const defaultCarData: CarData = {
  type: '',
  style: '',
  bodyColor: '#000000',
  wheelSize: 17,
  spoiler: false,
  lowered: false,
  backgroundScene: 'city',
  timeOfDay: 'day',
  collectionId: 'default',
  additionalDetails: '',
}

export default function CreateCar() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [collections, setCollections] = useState<Collection[]>([])
  const [carData, setCarData] = useState<CarData>(defaultCarData)
  const [isFormValid, setIsFormValid] = useState(false)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/collections')
        if (!response.ok) {
          throw new Error('Failed to fetch collections')
        }
        const data = await response.json()
        setCollections(data)
      } catch (error) {
        console.error('Error fetching collections:', error)
        toast.error('Failed to load collections')
      } finally {
        setLoading(false)
      }
    }

    fetchCollections()

    const savedPreferences = localStorage.getItem('carPreferences')
    if (savedPreferences) {
      setCarData(JSON.parse(savedPreferences))
    }
  }, [])

  const checkFormValidity = useCallback(() => {
    const isValid = Boolean(carData.type && carData.style)
    setIsFormValid(isValid)
    console.log("Form validity checked:", isValid, carData) // Debug log
  }, [carData.type, carData.style,])

  useEffect(() => {
    checkFormValidity()
  }, [checkFormValidity])

  const handleInputChange = (field: keyof CarData, value: string | number | boolean) => {
    setCarData(prev => {
      const newData = { ...prev, [field]: value }
      localStorage.setItem('carPreferences', JSON.stringify(newData))
      return newData
    })
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!isFormValid) return
    setLoading(true)
    try {
      const response = await fetch('/api/generate-car', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(carData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate car')
      }

      const data = await response.json()
      console.log('Car generation response:', data)
      toast.success('Car generation started!')
      router.push(`/results/${data.id}`)
    } catch (error) {
      console.error('Error generating car:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate car')
    } finally {
      setLoading(false)
    }
  }

  console.log("Render - Car data:", carData, "Is form valid:", isFormValid) // Debug log

  return (
    <form onSubmit={handleSubmit} className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8 text-center">Create Your Dream Car</h1>
      <Tabs defaultValue="basics" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-8">
          <TabsTrigger value="basics">Basics</TabsTrigger>
          <TabsTrigger value="exterior">Exterior</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="environment">Environment</TabsTrigger>
          <TabsTrigger value="collection">Collection</TabsTrigger>
        </TabsList>
        <TabsContent value="basics">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="car-type">Car Type</Label>
              <Select value={carData.type} onValueChange={(value) => handleInputChange('type', value)}>
                <SelectTrigger id="car-type">
                  <SelectValue placeholder="Select car type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedan">Sedan</SelectItem>
                  <SelectItem value="suv">SUV</SelectItem>
                  <SelectItem value="sports">Sports Car</SelectItem>
                  <SelectItem value="truck">Truck</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="car-style">Car Style</Label>
              <Select value={carData.style} onValueChange={(value) => handleInputChange('style', value)}>
                <SelectTrigger id="car-style">
                  <SelectValue placeholder="Select car style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="modern">Modern</SelectItem>
                  <SelectItem value="classic">Classic</SelectItem>
                  <SelectItem value="futuristic">Futuristic</SelectItem>
                  <SelectItem value="retro">Retro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="exterior">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="body-color">Body Color</Label>
              <div className="flex items-center space-x-4">
                <Input
                  id="body-color"
                  type="color"
                  value={carData.bodyColor}
                  onChange={(e) => handleInputChange('bodyColor', e.target.value)}
                  className="w-12 h-12 p-1 rounded-md"
                />
                <span className="text-sm text-gray-500">{carData.bodyColor}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wheel-size">Wheel Size</Label>
              <Slider
                id="wheel-size"
                min={15}
                max={22}
                step={1}
                value={[carData.wheelSize]}
                onValueChange={(value) => handleInputChange('wheelSize', value[0])}
              />
              <span className="text-sm text-gray-500">{carData.wheelSize} inches</span>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="spoiler">Spoiler</Label>
              <Switch
                id="spoiler"
                checked={carData.spoiler}
                onCheckedChange={(checked) => handleInputChange('spoiler', checked)}
              />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="performance">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="lowered">Lowered Suspension</Label>
              <Switch
                id="lowered"
                checked={carData.lowered}
                onCheckedChange={(checked) => handleInputChange('lowered', checked)}
              />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="environment">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="background-scene">Background Scene</Label>
              <Select value={carData.backgroundScene} onValueChange={(value) => handleInputChange('backgroundScene', value)}>
                <SelectTrigger id="background-scene">
                  <SelectValue placeholder="Select background scene" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="city">City</SelectItem>
                  <SelectItem value="nature">Nature</SelectItem>
                  <SelectItem value="racetrack">Racetrack</SelectItem>
                  <SelectItem value="studio">Studio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="time-of-day">Time of Day</Label>
              <Select value={carData.timeOfDay} onValueChange={(value) => handleInputChange('timeOfDay', value)}>
                <SelectTrigger id="time-of-day">
                  <SelectValue placeholder="Select time of day" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="night">Night</SelectItem>
                  <SelectItem value="sunset">Sunset</SelectItem>
                  <SelectItem value="dawn">Dawn</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="collection">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="collection">Collection</Label>
              <Select value={carData.collectionId} onValueChange={(value) => handleInputChange('collectionId', value)}>
                <SelectTrigger id="collection">
                  <SelectValue placeholder="Select collection" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default Collection</SelectItem>
                  {collections && collections.length > 0 ? (
                    collections.map((collection) => (
                      <SelectItem key={collection.id} value={collection.id}>
                        {collection.title}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>No collections available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      <div className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="additional-details">Additional Details</Label>
          <Textarea
            id="additional-details"
            placeholder="Add any additional details or specific requests for your car design..."
            value={carData.additionalDetails}
            onChange={(e) => handleInputChange('additionalDetails', e.target.value)}
            rows={4}
          />
        </div>
        <Button
          type="submit"
          disabled={loading || !isFormValid}
          className={`w-full ${!isFormValid ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            'Generate Car'
          )}
        </Button>
      </div>
    </form>
  )
}