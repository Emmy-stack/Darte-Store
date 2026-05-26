'use client'

import { Star, XIcon } from 'lucide-react';
import React, { useState } from 'react'
import { useDispatch } from 'react-redux';
import { addRating } from '@/lib/features/rating/ratingSlice';
import toast from 'react-hot-toast';

const RatingModal = ({ ratingModal, setRatingModal }) => {

    const dispatch = useDispatch();
    const [rating, setRating] = useState(0);
    const [review, setReview] = useState('');

    const handleSubmit = async () => {
        if (rating < 1 || rating > 5) {
            toast.error('Please select a rating');
            throw new Error('Please select a rating');
        }
        if (review.trim().length < 5) {
            toast.error('Please write a short review (at least 5 characters)');
            throw new Error('Please write a short review');
        }

        try {
            const res = await fetch('/api/ratings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    rating,
                    review: review.trim(),
                    productId: ratingModal.productId,
                    orderId: ratingModal.orderId
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to submit rating');
            }

            // Sync rating to Redux
            dispatch(addRating(data.rating));

            // Close modal
            setRatingModal(null);
            return data;
        } catch (error) {
            console.error('Failed to submit rating:', error);
            throw error;
        }
    }

    return (
        <div className='fixed inset-0 z-120 flex items-center justify-center bg-black/10'>
            <div className='bg-white p-8 rounded-lg shadow-lg w-96 relative'>
                <button onClick={() => setRatingModal(null)} className='absolute top-3 right-3 text-gray-500 hover:text-gray-700'>
                    <XIcon size={20} />
                </button>
                <h2 className='text-xl font-medium text-slate-600 mb-4'>Rate Product</h2>
                <div className='flex items-center justify-center mb-4'>
                    {Array.from({ length: 5 }, (_, i) => (
                        <Star
                            key={i}
                            className={`size-8 cursor-pointer ${rating > i ? "text-green-400 fill-current" : "text-gray-300"}`}
                            onClick={() => setRating(i + 1)}
                        />
                    ))}
                </div>
                <textarea
                    className='w-full p-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-green-400'
                    placeholder='Write your review (optional)'
                    rows='4'
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                ></textarea>
                <button
                    onClick={() => toast.promise(handleSubmit(), {
                        loading: 'Submitting rating...',
                        success: 'Review submitted successfully!',
                        error: (err) => err.message || 'Failed to submit rating'
                    })}
                    className='w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition'
                >
                    Submit Rating
                </button>
            </div>
        </div>
    )
}

export default RatingModal