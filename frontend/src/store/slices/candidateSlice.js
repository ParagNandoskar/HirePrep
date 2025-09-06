import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunks
export const fetchCandidateProfile = createAsyncThunk(
  'candidate/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/candidates/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (!data.success) {
        return rejectWithValue(data.message);
      }
      
      return data.candidate;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateCandidateProfile = createAsyncThunk(
  'candidate/updateProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/candidates/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });
      const data = await response.json();
      
      if (!data.success) {
        return rejectWithValue(data.message);
      }
      
      return data.candidate;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const uploadResume = createAsyncThunk(
  'candidate/uploadResume',
  async (formData, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/resumes/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await response.json();
      
      if (!data.success) {
        return rejectWithValue(data.message);
      }
      
      return data.resume;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchCandidateApplications = createAsyncThunk(
  'candidate/fetchApplications',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/candidates/applications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (!data.success) {
        return rejectWithValue(data.message);
      }
      
      return data.applications;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchJobRecommendations = createAsyncThunk(
  'candidate/fetchRecommendations',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/candidates/recommendations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (!data.success) {
        return rejectWithValue(data.message);
      }
      
      return data.recommendations;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const candidateSlice = createSlice({
  name: 'candidate',
  initialState: {
    profile: null,
    resume: null,
    applications: [],
    recommendations: [],
    loading: false,
    error: null,
    uploadProgress: 0
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUploadProgress: (state, action) => {
      state.uploadProgress = action.payload;
    },
    resetUploadProgress: (state) => {
      state.uploadProgress = 0;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Profile
      .addCase(fetchCandidateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCandidateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
        state.resume = action.payload.resume;
      })
      .addCase(fetchCandidateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update Profile
      .addCase(updateCandidateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCandidateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(updateCandidateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Upload Resume
      .addCase(uploadResume.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadResume.fulfilled, (state, action) => {
        state.loading = false;
        state.resume = action.payload;
        state.uploadProgress = 0;
      })
      .addCase(uploadResume.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.uploadProgress = 0;
      })
      
      // Fetch Applications
      .addCase(fetchCandidateApplications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCandidateApplications.fulfilled, (state, action) => {
        state.loading = false;
        state.applications = action.payload;
      })
      .addCase(fetchCandidateApplications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch Recommendations
      .addCase(fetchJobRecommendations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchJobRecommendations.fulfilled, (state, action) => {
        state.loading = false;
        state.recommendations = action.payload;
      })
      .addCase(fetchJobRecommendations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearError, setUploadProgress, resetUploadProgress } = candidateSlice.actions;
export default candidateSlice.reducer;
