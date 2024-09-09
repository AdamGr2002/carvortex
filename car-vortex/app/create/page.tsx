'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { toast } from 'react-hot-toast'

const steps = [
  { id: 'type', title: 'Car Type' },
  { id: 'style', title: 'Style' },
  { id: 'environment', title: 'Environment' },
  { id: 'details', title: 'Additional Details' },
]

export default function CreateCar() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [generatingCar, setGeneratingCar] = useState(false)
  const [carData, setCarData] = useState({
    type: '',
    style: '',
    environment: '',
    details: '',
  })

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleGenerateNew()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleGenerateNew = async () => {
    setGeneratingCar(true)
    try {
      const response = await fetch('/api/generate-car', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(carData),
      })

      if (!response.ok) {
        throw new Error('Failed to initiate car generation')
      }

      const data = await response.json()
      pollCarStatus(data.id)
    } catch (error) {
      console.error('Error generating car:', error)
      toast.error('Failed to generate car')
      setGeneratingCar(false)
    }
  }

  const pollCarStatus = async (id: string) => {
    try {
      const response = await fetch(`/api/car-status/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch car status')
      }
      const data = await response.json()
      if (data.status === 'COMPLETED') {
        toast.success('Car generated successfully!')
        router.push(`/results/${id}`)
      } else if (data.status === 'FAILED') {
        toast.error('Car generation failed')
        setGeneratingCar(false)
      } else {
        setTimeout(() => pollCarStatus(id), 5000) // Poll every 5 seconds
      }
    } catch (error) {
      console.error('Error polling car status:', error)
      toast.error('Failed to check car status')
      setGeneratingCar(false)
    }
  }

  const updateCarData = (field: string, value: string) => {
    setCarData({ ...carData, [field]: value })
  }

  const isStepComplete = () => {
    const currentField = steps[currentStep].id as keyof typeof carData
    return carData[currentField] !== ''
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white py-12">
      <div className="container mx-auto max-w-2xl">
        <h1 className="text-4xl font-bold mb-8 text-center">Create Your Dream Car</h1>
        
        <div className="mb-8">
          <div className="flex justify-between">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`text-sm ${index <= currentStep ? 'text-blue-500' : 'text-gray-500'}`}
              >
                {step.title}
              </div>
            ))}
          </div>
          <div className="mt-2 h-2 bg-gray-700 rounded-full">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-in-out"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="space-y-8">
          {currentStep === 0 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Select Car Type</h2>
              <Select onValueChange={(value) => updateCarData('type', value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a car type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedan">Sedan</SelectItem>
                  <SelectItem value="suv">SUV</SelectItem>
                  <SelectItem value="sports">Sports Car</SelectItem>
                  <SelectItem value="truck">Truck</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {currentStep === 1 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Choose Style</h2>
              <Select onValueChange={(value) => updateCarData('style', value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="futuristic">Futuristic</SelectItem>
                  <SelectItem value="classic">Classic</SelectItem>
                  <SelectItem value="minimalist">Minimalist</SelectItem>
                  <SelectItem value="luxurious">Luxurious</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Select Environment</h2>
              <Select onValueChange={(value) => updateCarData('environment', value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose an environment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="city">City</SelectItem>
                  <SelectItem value="nature">Nature</SelectItem>
                  <SelectItem value="studio">Studio</SelectItem>
                  <SelectItem value="racetrack">Racetrack</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Additional Details</h2>
              <Input
                placeholder="Describe any additional details"
                onChange={(e) => updateCarData('details', e.target.value)}
                className="bg-gray-700 text-white"
              />
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-between">
          <Button 
            onClick={handleBack} 
            disabled={currentStep === 0 || generatingCar}
            variant="outline"
          >
            Back
          </Button>
          <Button 
            onClick={handleNext} 
            disabled={!isStepComplete() || generatingCar}
          >
            {generatingCar ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : currentStep === steps.length - 1 ? (
              'Generate Car'
            ) : (
              'Next'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}