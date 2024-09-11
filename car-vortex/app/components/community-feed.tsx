/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Heart, MessageCircle, Share2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

type CarDesign = {
  id: string
  title: string
  imageUrl: string
  creator: {
    name: string
    avatar: string
  }
  likes: number
  comments: number
  createdAt: string
}

export default function CommunityFeed() {
  const [activeTab, setActiveTab] = useState('recent')
  const [carDesigns, setCarDesigns] = useState<CarDesign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCarDesigns()
  }, [activeTab])

  const fetchCarDesigns = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/car-designs?sort=${activeTab}`)
      if (!response.ok) {
        throw new Error('Failed to fetch car designs')
      }
      const data = await response.json()
      setCarDesigns(data)
    } catch (err) {
      setError('Failed to load car designs. Please try again later.')
      console.error('Error fetching car designs:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLike = async (designId: string) => {
    try {
      const response = await fetch(`/api/car-designs/${designId}/like`, { method: 'POST' })
      if (!response.ok) {
        throw new Error('Failed to like design')
      }
      const updatedDesign = await response.json()
      setCarDesigns(carDesigns.map(design => design.id === designId ? updatedDesign : design))
      toast.success('Design liked successfully!')
    } catch (err) {
      toast.error('Failed to like design. Please try again.')
      console.error('Error liking design:', err)
    }
  }

  const handleComment = async (designId: string) => {
    // In a real application, this would open a comment modal or navigate to a comment page
    toast.success('Comment feature coming soon!')
  }

  const handleShare = async (designId: string) => {
    try {
      const response = await fetch(`/api/car-designs/${designId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch design details')
      }
      const designData = await response.json()
      const shareUrl = `${window.location.origin}/designs/${designId}`
      await navigator.share({
        title: designData.title,
        text: `Check out this amazing car design: ${designData.title}`,
        url: shareUrl,
      })
      toast.success('Design shared successfully!')
    } catch (err) {
      toast.error('Failed to share design. Please try again.')
      console.error('Error sharing design:', err)
    }
  }

  if (isLoading) {
    return <div className="text-center py-10">Loading community feed...</div>
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">{error}</div>
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Community Feed</h1>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recent">Recent</TabsTrigger>
          <TabsTrigger value="top">Top Rated</TabsTrigger>
          <TabsTrigger value="trending">Trending</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab}>
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {carDesigns.map((design) => (
                <Card key={design.id}>
                  <CardHeader>
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarImage src={design.creator.avatar} alt={design.creator.name} />
                        <AvatarFallback>{design.creator.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle>{design.title}</CardTitle>
                        <p className="text-sm text-gray-500">by {design.creator.name}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <img src={design.imageUrl} alt={design.title} className="w-full h-64 object-cover rounded-md" />
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <div className="flex space-x-4">
                      <Button size="sm" variant="ghost" onClick={() => handleLike(design.id)}>
                        <Heart className="mr-2 h-4 w-4" />
                        {design.likes}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleComment(design.id)}>
                        <MessageCircle className="mr-2 h-4 w-4" />
                        {design.comments}
                      </Button>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => handleShare(design.id)}>
                      <Share2 className="mr-2 h-4 w-4" />
                      Share
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}