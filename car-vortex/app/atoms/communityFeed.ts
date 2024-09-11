import { atom } from 'jotai'

export interface Car {
  id: string
  title: string
  imageUrl: string | null
  status: 'PENDING' | 'COMPLETED' | 'FAILED'
  likes: number
  user: {
    name: string
  }
}

export const communityFeedAtom = atom<Car[]>([])