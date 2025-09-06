import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunks
export const fetchJobs = createAsyncThunk(
  'jobs/fetchJobs',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      
      // Add filters to query params
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          queryParams.append(key, filters[key]);
        }
      });
      
      const response = await fetch(`http://localhost:5000/api/jobs?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (!data.success) {
        return rejectWithValue(data.message);
      }
      
      return data.jobs;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchJobById = createAsyncThunk(
  'jobs/fetchJobById',
  async (jobId, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (!data.success) {
        return rejectWithValue(data.message);
      }
      
      return data.job;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const applyForJob = createAsyncThunk(
  'jobs/applyForJob',
  async (jobId, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (!data.success) {
        return rejectWithValue(data.message);
      }
      
      return jobId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const searchJobs = createAsyncThunk(
  'jobs/searchJobs',
  async ({ query, filters }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const searchParams = new URLSearchParams();
      
      if (query) searchParams.append('search', query);
      
      // Add filters
      Object.keys(filters || {}).forEach(key => {
        if (filters[key]) {
          searchParams.append(key, filters[key]);
        }
      });
      
      const response = await fetch(`http://localhost:5000/api/jobs/search?${searchParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (!data.success) {
        return rejectWithValue(data.message);
      }
      
      return data.jobs;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const saveJob = createAsyncThunk(
  'jobs/saveJob',
  async (jobId, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/jobs/${jobId}/save`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (!data.success) {
        return rejectWithValue(data.message);
      }
      
      return jobId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const unsaveJob = createAsyncThunk(
  'jobs/unsaveJob',
  async (jobId, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/jobs/${jobId}/save`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (!data.success) {
        return rejectWithValue(data.message);
      }
      
      return jobId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchSimilarJobs = createAsyncThunk(
  'jobs/fetchSimilarJobs',
  async (jobId, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/jobs/${jobId}/similar`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (!data.success) {
        return rejectWithValue(data.message);
      }
      
      return data.jobs;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const jobsSlice = createSlice({
  name: 'jobs',
  initialState: {
    jobs: [],
    currentJob: null,
    similarJobs: [],
    savedJobs: [],
    appliedJobs: [],
    filters: {
      location: '',
      jobType: '',
      salaryRange: '',
      skills: [],
      experience: ''
    },
    searchQuery: '',
    loading: false,
    error: null,
    pagination: {
      page: 1,
      totalPages: 1,
      totalJobs: 0
    }
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {
        location: '',
        jobType: '',
        salaryRange: '',
        skills: [],
        experience: ''
      };
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    setCurrentJob: (state, action) => {
      state.currentJob = action.payload;
    },
    setPagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Jobs
      .addCase(fetchJobs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchJobs.fulfilled, (state, action) => {
        state.loading = false;
        state.jobs = action.payload;
      })
      .addCase(fetchJobs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch Job by ID
      .addCase(fetchJobById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchJobById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentJob = action.payload;
      })
      .addCase(fetchJobById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Apply for Job
      .addCase(applyForJob.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(applyForJob.fulfilled, (state, action) => {
        state.loading = false;
        if (!state.appliedJobs.includes(action.payload)) {
          state.appliedJobs.push(action.payload);
        }
        // Update the job in the jobs array
        const jobIndex = state.jobs.findIndex(job => job._id === action.payload);
        if (jobIndex !== -1) {
          // Assuming we have user info to add to applicants
          // This would be better handled with user ID from the state
        }
      })
      .addCase(applyForJob.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Search Jobs
      .addCase(searchJobs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchJobs.fulfilled, (state, action) => {
        state.loading = false;
        state.jobs = action.payload;
      })
      .addCase(searchJobs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Save Job
      .addCase(saveJob.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(saveJob.fulfilled, (state, action) => {
        state.loading = false;
        if (!state.savedJobs.includes(action.payload)) {
          state.savedJobs.push(action.payload);
        }
      })
      .addCase(saveJob.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Unsave Job
      .addCase(unsaveJob.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(unsaveJob.fulfilled, (state, action) => {
        state.loading = false;
        state.savedJobs = state.savedJobs.filter(jobId => jobId !== action.payload);
      })
      .addCase(unsaveJob.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch Similar Jobs
      .addCase(fetchSimilarJobs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSimilarJobs.fulfilled, (state, action) => {
        state.loading = false;
        state.similarJobs = action.payload;
      })
      .addCase(fetchSimilarJobs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { 
  clearError, 
  setFilters, 
  clearFilters, 
  setSearchQuery, 
  setCurrentJob,
  setPagination 
} = jobsSlice.actions;

export default jobsSlice.reducer;
