import { v2 as cloudinary } from 'cloudinary'

if (!process.env.CLOUDINARY_URL) {
    throw new Error('CLOUDINARY_URL is not set in the environment variables')
}

cloudinary.config(process.env.CLOUDINARY_URL)

export default cloudinary