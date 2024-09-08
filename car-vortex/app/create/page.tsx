'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from 'react-toastify'

const steps = [
  { id: 'type', title: 'Car Type' },
  { id: 'style', title: 'Style' },
  { id: 'environment', title: 'Environment' },
  { id: 'details', title: 'Additional Details' },
]

export default function CreateCar() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
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
    setIsGenerating(true)
    try {
      console.log('Sending car data:', carData)

      const response = await fetch('/api/generate-car', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(carData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API error:', errorData)
        if (errorData.error === 'Not enough credits') {
          toast.error('You do not have enough credits to generate a car. Please purchase more credits.')
        } else {
          throw new Error(errorData.error || 'Failed to generate car')
        }
        return
      }

      const data = await response.json()
      console.log('Generated car:', data)
      
      router.push(`/results/${data.id}`)
    } catch (error) {
      console.error('Error generating car:', error)
      toast.error(`Failed to generate car: ${(error as Error).message}`)
    } finally {
      setIsGenerating(false)
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

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {currentStep === 0 && (
              <div>
                <h2 className="text-2xl font-semibold mb-4">Select Car Type</h2>
                <Select onValueChange={(value) => updateCarData('type', value)}>
                  <SelectTrigger>
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
                  <SelectTrigger>
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
                  <SelectTrigger>
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
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex justify-between">
          <Button onClick={handleBack} disabled={currentStep === 0}>
            Back
          </Button>
          <Button 
            onClick={handleNext} 
            disabled={!isStepComplete() || isGenerating}
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
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