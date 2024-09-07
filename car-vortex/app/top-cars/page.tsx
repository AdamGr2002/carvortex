import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = {
  title: 'Top Cars | Car Vortex',
  description: 'View the top-rated cars in our gallery',
}

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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Top Cars</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {topCars.map((car) => (
          <div key={car.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <img src={car.imageUrl} alt={car.title} className="w-full h-48 object-cover" />
            <div className="p-4">
              <h2 className="text-xl font-semibold mb-2">{car.title}</h2>
              <p className="text-gray-600 mb-2">Votes: {car.votes}</p>
              <p className="text-sm text-gray-500">Style: {car.style}</p>
              <p className="text-sm text-gray-500">Environment: {car.environment}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}