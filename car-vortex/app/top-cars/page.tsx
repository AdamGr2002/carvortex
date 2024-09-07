import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Trophy } from 'lucide-react'

export const revalidate = 3600 // Revalidate every hour

async function getTopCars() {
  const cars = await prisma.car.findMany({
    orderBy: {
      votes: 'desc',
    },
    take: 10,
  })
  return cars
}

export default async function TopCars() {
  const topCars = await getTopCars()

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Top Cars of All Time</h1>
        <Link href="/">
          <Button variant="outline">
            Back to Gallery
          </Button>
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {topCars.map((car, index) => (
          <Card key={car.id} className="overflow-hidden">
            <CardContent className="p-0">
              <img src={car.imageUrl} alt={car.title} className="w-full h-48 object-cover" />
            </CardContent>
            <CardFooter className="flex justify-between items-center p-4">
              <div>
                <h2 className="text-lg font-semibold">{car.title}</h2>
                <p className="text-sm text-gray-500">Votes: {car.votes}</p>
              </div>
              {index === 0 && (
                <Trophy className="w-6 h-6 text-yellow-400" />
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}