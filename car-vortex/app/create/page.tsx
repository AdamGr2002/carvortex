/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useState, useEffect } from 'react'
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

export default function CreateCar() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [collections, setCollections] = useState<Collection[]>([])
  const [carData, setCarData] = useState({
    type: '',
    style: '',
    environment: '',
    bodyColor: '#000000',
    wheelSize: 17,
    spoiler: false,
    lowered: false,
    backgroundScene: 'city',
    timeOfDay: 'day',
    collectionId: 'default',
    additionalDetails: '',
  })

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const response = await fetch('/api/collections')
        if (!response.ok) {
          throw new Error('Failed to fetch collections')
        }
        const data = await response.json()
        setCollections(data)
      } catch (error) {
        console.error('Error fetching collections:', error)
        toast.error('Failed to load collections')
      }
    }

    fetchCollections()
  }, [])

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setCarData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/generate-car', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(carData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate car')
      }

      const data = await response.json()
      toast.success('Car generation started!')
      router.push(`/results/${data.id}`)
    } catch (error) {
      console.error('Error generating car:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate car')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
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
              <Label htmlFor="type">Car Type</Label>
              <Select onValueChange={(value) => handleInputChange('type', value)}>
                <SelectTrigger id="type">
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
              <Label htmlFor="style">Car Style</Label>
              <Select onValueChange={(value) => handleInputChange('style', value)}>
                <SelectTrigger id="style">
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
              <Label htmlFor="bodyColor">Body Color</Label>
              <div className="flex items-center space-x-4">
                <Input
                  id="bodyColor"
                  type="color"
                  value={carData.bodyColor}
                  onChange={(e) => handleInputChange('bodyColor', e.target.value)}
                  className="w-12 h-12 p-1 rounded-md"
                />
                <span className="text-sm text-gray-500">{carData.bodyColor}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wheelSize">Wheel Size</Label>
              <Slider
                id="wheelSize"
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
              <Label htmlFor="backgroundScene">Background Scene</Label>
              <Select onValueChange={(value) => handleInputChange('backgroundScene', value)}>
                <SelectTrigger id="backgroundScene">
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
              <Label htmlFor="timeOfDay">Time of Day</Label>
              <Select onValueChange={(value) => handleInputChange('timeOfDay', value)}>
                <SelectTrigger id="timeOfDay">
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
              <Select onValueChange={(value) => handleInputChange('collectionId', value)}>
                <SelectTrigger id="collection">
                  <SelectValue placeholder="Select collection" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default Collection</SelectItem>
                  {collections.map((collection) => (
                    <SelectItem key={collection.id} value={collection.id}>
                      {collection.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      <div className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="additionalDetails">Additional Details</Label>
          <Textarea
            id="additionalDetails"
            placeholder="Add any additional details or specific requests for your car design..."
            value={carData.additionalDetails}
            onChange={(e) => handleInputChange('additionalDetails', e.target.value)}
            rows={4}
          />
        </div>
        <Button
          onClick={handleSubmit}
          disabled={loading || !carData.type || !carData.style || !carData.environment}
          className="w-full"
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
    </div>
  )
}