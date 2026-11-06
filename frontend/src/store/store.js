import { configureStore } from '@reduxjs/toolkit'
import rca from './rcaSlice'

export default configureStore({ reducer: { rca } })
