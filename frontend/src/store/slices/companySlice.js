import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunks
export const fetchCompanyProfile = createAsyncThunk(
  'company/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/companies/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (!data.success) {
        return rejectWithValue(data.message);
      }
      
      return data.company;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateCompanyProfile = createAsyncThunk(
  'company/updateProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/companies/profile', {
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
      
      return data.company;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchCompanyJobs = createAsyncThunk(
  'company/fetchJobs',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/companies/jobs', {
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

export const createJob = createAsyncThunk(
  'company/createJob',
  async (jobData, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/jobs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(jobData)
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

export const updateJob = createAsyncThunk(
  'company/updateJob',
  async ({ jobId, jobData }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(jobData)
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

export const deleteJob = createAsyncThunk(
  'company/deleteJob',
  async (jobId, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/jobs/${jobId}`, {
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

export const fetchJobApplications = createAsyncThunk(
  'company/fetchJobApplications',
  async (jobId, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/jobs/${jobId}/applications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (!data.success) {
        return rejectWithValue(data.message);
      }
      
      return { jobId, applications: data.applications };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateApplicationStatus = createAsyncThunk(
  'company/updateApplicationStatus',
  async ({ jobId, candidateId, status }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/jobs/${jobId}/applications/${candidateId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      
      if (!data.success) {
        return rejectWithValue(data.message);
      }
      
      return { jobId, candidateId, status };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const companySlice = createSlice({
  name: 'company',
  initialState: {
    profile: null,
    jobs: [],
    applications: {},
    analytics: null,
    loading: false,
    error: null
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSelectedJob: (state, action) => {
      state.selectedJob = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Profile
      .addCase(fetchCompanyProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCompanyProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(fetchCompanyProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update Profile
      .addCase(updateCompanyProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCompanyProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(updateCompanyProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch Jobs
      .addCase(fetchCompanyJobs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCompanyJobs.fulfilled, (state, action) => {
        state.loading = false;
        state.jobs = action.payload;
      })
      .addCase(fetchCompanyJobs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Create Job
      .addCase(createJob.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createJob.fulfilled, (state, action) => {
        state.loading = false;
        state.jobs.push(action.payload);
      })
      .addCase(createJob.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update Job
      .addCase(updateJob.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateJob.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.jobs.findIndex(job => job._id === action.payload._id);
        if (index !== -1) {
          state.jobs[index] = action.payload;
        }
      })
      .addCase(updateJob.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Delete Job
      .addCase(deleteJob.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteJob.fulfilled, (state, action) => {
        state.loading = false;
        state.jobs = state.jobs.filter(job => job._id !== action.payload);
        delete state.applications[action.payload];
      })
      .addCase(deleteJob.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch Job Applications
      .addCase(fetchJobApplications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchJobApplications.fulfilled, (state, action) => {
        state.loading = false;
        state.applications[action.payload.jobId] = action.payload.applications;
      })
      .addCase(fetchJobApplications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update Application Status
      .addCase(updateApplicationStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateApplicationStatus.fulfilled, (state, action) => {
        state.loading = false;
        const { jobId, candidateId, status } = action.payload;
        if (state.applications[jobId]) {
          const application = state.applications[jobId].find(app => app.candidate._id === candidateId);
          if (application) {
            application.status = status;
          }
        }
      })
      .addCase(updateApplicationStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearError, setSelectedJob } = companySlice.actions;
export default companySlice.reducer;
