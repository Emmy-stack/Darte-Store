'use client'
import { assets } from "@/assets/assets"
import Image from "next/image"
import { useState } from "react"
import { toast } from "react-hot-toast"
import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import axios from "axios"

export default function StoreAddProduct() {

    const categories = ['Men', 'Women', 'Gadgets', 'Clothing', 'Jewelry', 'Beauty', 'Home', 'Gaming', 'Gifts', 'Luxury', 'Trending', 'Deals']

    const [images, setImages] = useState({ 1: null, 2: null, 3: null, 4: null })
    const [productInfo, setProductInfo] = useState({
        name: "",
        description: "",
        mrp: "",
        price: "",
        category: "",
    })
    const [loading, setLoading] = useState(false)
    const { getToken } = useAuth()
    const router = useRouter()


    const onChangeHandler = (e) => {
        const { name, value } = e.target
        if (name === 'name' && value.length > 25) return
        setProductInfo((prev) => ({ ...prev, [name]: value }))
    }

    const onSubmitHandler = async (e) => {
        e.preventDefault()
        try {
            setLoading(true)
            const hasImage = Object.values(images).some(img => img !== null)
            if (!hasImage) {
                toast.error("Please upload at least one image.")
                throw new Error("Please upload at least one image.")
            }

            const mrp = Number(productInfo.mrp)
            const priceInput = Number(productInfo.price)
            const finalPrice = Number.isFinite(priceInput) && priceInput > 0 ? priceInput : mrp

            if (!productInfo.name.trim() || !productInfo.description.trim() || !productInfo.category || !mrp || mrp <= 0) {
                toast.error("Please fill in all required product fields and enter a valid actual price.")
                throw new Error("Please fill in all required product fields and enter a valid actual price.")
            }

            const formData = new FormData()
            formData.append("name", productInfo.name)
            formData.append("description", productInfo.description)
            formData.append("mrp", mrp)
            formData.append("price", finalPrice)
            formData.append("category", productInfo.category)

            Object.keys(images).forEach((key) => {
                if (images[key]) {
                    formData.append("images", images[key])
                }
            })

            const token = await getToken()
            const { data } = await axios.post("/api/store/product", formData, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data"
                }
            })

            toast.success(data.message || "Product added successfully!")
            
            // Reset form
            setProductInfo({
                name: "",
                description: "",
                mrp: "",
                price: "",
                category: "",
            })
            setImages({ 1: null, 2: null, 3: null, 4: null })
            
            router.push("/store/manage-product")
            return data;
        } catch (error) {
            const errorMessage = error?.response?.data?.error || error.message || "Failed to add product";
            toast.error(errorMessage)
            throw new Error(errorMessage);
        } finally {
            setLoading(false)
        }
    }


    return (
        <form onSubmit={e => toast.promise(onSubmitHandler(e), { loading: "Adding Product..." })} className="text-slate-500 mb-28">
            <h1 className="text-2xl">Add New <span className="text-slate-800 font-medium">Products</span></h1>
            <p className="mt-7">Product Images</p>

            <div htmlFor="" className="flex gap-3 mt-4">
                {Object.keys(images).map((key) => (
                    <label key={key} htmlFor={`images${key}`}>
                        <Image width={300} height={300} className='h-15 w-auto border border-slate-200 rounded cursor-pointer' src={images[key] ? URL.createObjectURL(images[key]) : assets.upload_area} alt="" />
                        <input type="file" accept='image/*' id={`images${key}`} onChange={e => setImages({ ...images, [key]: e.target.files[0] })} hidden />
                    </label>
                ))}
            </div>

            <label htmlFor="" className="flex flex-col gap-2 my-6 ">
                Name
                <input type="text" name="name" maxLength={25} onChange={onChangeHandler} value={productInfo.name} placeholder="Enter product name" className={`w-full max-w-sm p-2 px-4 outline-none border rounded transition-colors ${ productInfo.name.length >= 25 ? 'border-red-400 focus:ring-2 focus:ring-red-100' : 'border-slate-200' }`} required />
                <div className="flex items-center justify-between max-w-sm">
                    {productInfo.name.length >= 25 && (
                        <p className="text-red-500 text-xs font-medium animate-pulse">Maximum 25 characters reached!</p>
                    )}
                    <p className={`text-xs ml-auto ${ productInfo.name.length >= 25 ? 'text-red-500 font-semibold' : 'text-slate-400' }`}>{productInfo.name.length}/25</p>
                </div>
            </label>

            <label htmlFor="" className="flex flex-col gap-2 my-6 ">
                Description
                <textarea name="description" onChange={onChangeHandler} value={productInfo.description} placeholder="Enter product description" rows={5} className="w-full max-w-sm p-2 px-4 outline-none border border-slate-200 rounded resize-none" required />
            </label>

            <div className="flex gap-5">
                <label htmlFor="" className="flex flex-col gap-2 ">
                    Actual Price (₦)
                    <input type="number" name="mrp" onChange={onChangeHandler} value={productInfo.mrp} placeholder="0" rows={5} className="w-full max-w-45 p-2 px-4 outline-none border border-slate-200 rounded resize-none" required />
                </label>
                <label htmlFor="" className="flex flex-col gap-2 ">
                    Offer Price (₦)
                    <input type="number" name="price" onChange={onChangeHandler} value={productInfo.price} placeholder="0" rows={5} className="w-full max-w-45 p-2 px-4 outline-none border border-slate-200 rounded resize-none" />
                    <p className="text-xs text-slate-400">Leave blank or enter 0 to use the actual price.</p>
                </label>
            </div>

            <select onChange={e => setProductInfo({ ...productInfo, category: e.target.value })} value={productInfo.category} className="w-full max-w-sm p-2 px-4 my-6 outline-none border border-slate-200 rounded" required>
                <option value="">Select a category</option>
                {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                ))}
            </select>

            <br />

            <button disabled={loading} className="bg-slate-800 text-white px-6 mt-7 py-2 hover:bg-slate-900 rounded transition">Add Product</button>
        </form>
    )
}