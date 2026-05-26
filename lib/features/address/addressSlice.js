import { createSlice } from '@reduxjs/toolkit'

const addressSlice = createSlice({
    name: 'address',
    initialState: {
        list: [],
    },
    reducers: {
        setAddresses: (state, action) => {
            state.list = action.payload || []
        },
        addAddress: (state, action) => {
            state.list.push(action.payload)
        },
    }
})

export const { setAddresses, addAddress } = addressSlice.actions

export default addressSlice.reducer