// store/authSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  access_token: null,
  user_id: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setToken: (state, action) => {
      state.access_token = action.payload;
    },
    setUserId: (state, action) => {
      state.user_id = action.payload;
    },
    clearAuthData: (state) => {
      state.access_token = null;
      state.user_id = null;
    },
  },
});

export const { setToken, setUserId, clearAuthData } = authSlice.actions;

export default authSlice.reducer;
