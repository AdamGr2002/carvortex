import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
    CLOUDINARY_URL: process.env.CLOUDINARY_URL
})

export default cloudinary