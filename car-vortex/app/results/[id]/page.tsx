'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Share2, Download, ThumbsUp } from 'lucide-react'
import { toast } from 'react-toastify'

interface Car {
  id: string
  imageUrl: string
  title: string
  description: string
  votes: number
}

export default function CarResults() {
  const { id } = useParams()
  const [car, setCar] = useState<Car | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
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
        toast.error('Failed to load car details')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCar()
  }, [id])

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: car?.title,
        text: car?.description,
        url: window.location.href,
      }).then(() => {
        console.log('Thanks for sharing!')
      }).catch(console.error)
    } else {
      // Fallback for browsers that don't support navigator.share
      toast.info('Use this link to share: ' + window.location.href)
    }
  }

  const handleDownload = () => {
    if (car) {
      const link = document.createElement('a')
      link.href = car.imageUrl
      link.download = `${car.title}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleVote = async () => {
    if (car) {
      try {
        const response = await fetch(`/api/cars/${car.id}/vote`, { method: 'POST' })
        if (!response.ok) {
          throw new Error('Failed to vote')
        }
        const updatedCar = await response.json()
        setCar(updatedCar)
        toast.success('Vote recorded!')
      } catch (error) {
        console.error('Error voting:', error)
        toast.error('Failed to record vote')
      }
    }
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  if (!car) {
    return <div className="flex justify-center items-center h-screen">Car not found</div>
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">{car.title}</h1>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <img src={car.imageUrl} alt={car.title} className="w-full h-auto" />
        </CardContent>
      </Card>
      <p className="mt-4 text-lg">{car.description}</p>
      <div className="flex justify-between items-center mt-6">
        <div className="flex space-x-2">
          <Button onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" /> Share
          </Button>
          <Button onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" /> Download
          </Button>
          <Button onClick={handleVote}>
            <ThumbsUp className="mr-2 h-4 w-4" /> Vote ({car.votes})
          </Button>
        </div>
        <Link href="/create">
          <Button variant="outline">Create Another</Button>
        </Link>
      </div>
    </div>
  )
}