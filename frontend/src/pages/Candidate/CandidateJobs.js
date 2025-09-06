import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Search, MapPin, Clock, DollarSign, Building, Users, Filter } from 'lucide-react';

const CandidateJobs = () => {
  const { user } = useSelector((state) => state.auth);
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    location: '',
    jobType: '',
    experienceLevel: '',
    salaryRange: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    filterJobs();
  }, [jobs, searchQuery, filters]);

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setJobs(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setLoading(false);
    }
  };

  const filterJobs = () => {
    let filtered = jobs;

    // Search query filter
    if (searchQuery) {
      filtered = filtered.filter(job =>
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company.companyName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Location filter
    if (filters.location) {
      filtered = filtered.filter(job =>
        job.location.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    // Job type filter
    if (filters.jobType) {
      filtered = filtered.filter(job => job.jobType === filters.jobType);
    }

    // Experience level filter
    if (filters.experienceLevel) {
      filtered = filtered.filter(job => job.experienceLevel === filters.experienceLevel);
    }

    // Salary range filter
    if (filters.salaryRange) {
      const [min, max] = filters.salaryRange.split('-').map(Number);
      filtered = filtered.filter(job => {
        const jobSalary = job.salary;
        return jobSalary >= min && (max ? jobSalary <= max : true);
      });
    }

    setFilteredJobs(filtered);
  };

  const handleApply = async (jobId) => {
    try {
      const response = await fetch('/api/candidates/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ jobId })
      });

      if (response.ok) {
        // Update the job to show it's been applied to
        setJobs(jobs.map(job => 
          job._id === jobId 
            ? { ...job, hasApplied: true }
            : job
        ));
      }
    } catch (error) {
      console.error('Error applying to job:', error);
    }
  };

  const formatSalary = (salary) => {
    return salary >= 1000 ? `$${(salary / 1000).toFixed(0)}k` : `$${salary}`;
  };

  const formatDate = (date) => {
    const now = new Date();
    const posted = new Date(date);
    const diffTime = Math.abs(now - posted);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return `${Math.ceil(diffDays / 30)} months ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900">Find Jobs</h1>
          <p className="mt-2 text-gray-600">
            Discover opportunities that match your skills and interests
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="p-6">
            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search jobs, companies, or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </button>
            </div>

            {/* Filter Options */}
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="City, State"
                    value={filters.location}
                    onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Type
                  </label>
                  <select
                    value={filters.jobType}
                    onChange={(e) => setFilters({ ...filters, jobType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Types</option>
                    <option value="full-time">Full Time</option>
                    <option value="part-time">Part Time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Experience Level
                  </label>
                  <select
                    value={filters.experienceLevel}
                    onChange={(e) => setFilters({ ...filters, experienceLevel: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Levels</option>
                    <option value="entry">Entry Level</option>
                    <option value="mid">Mid Level</option>
                    <option value="senior">Senior Level</option>
                    <option value="executive">Executive</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Salary Range
                  </label>
                  <select
                    value={filters.salaryRange}
                    onChange={(e) => setFilters({ ...filters, salaryRange: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Ranges</option>
                    <option value="0-50000">Under $50k</option>
                    <option value="50000-80000">$50k - $80k</option>
                    <option value="80000-120000">$80k - $120k</option>
                    <option value="120000-150000">$120k - $150k</option>
                    <option value="150000-">$150k+</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            Showing {filteredJobs.length} of {jobs.length} jobs
          </p>
        </div>

        {/* Job Listings */}
        <div className="space-y-6">
          {filteredJobs.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-12 text-center">
              <Search className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search criteria or filters.
              </p>
            </div>
          ) : (
            filteredJobs.map((job) => (
              <div key={job._id} className="bg-white shadow rounded-lg hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h3 className="text-lg font-medium text-gray-900">
                          {job.title}
                        </h3>
                        <span className={`ml-3 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          job.jobType === 'full-time' ? 'bg-green-100 text-green-800' :
                          job.jobType === 'part-time' ? 'bg-blue-100 text-blue-800' :
                          job.jobType === 'contract' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {job.jobType.replace('-', ' ')}
                        </span>
                      </div>
                      
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <Building className="h-4 w-4 mr-1" />
                        <span className="mr-4">{job.company.companyName}</span>
                        <MapPin className="h-4 w-4 mr-1" />
                        <span className="mr-4">{job.location}</span>
                        <Clock className="h-4 w-4 mr-1" />
                        <span>{formatDate(job.postedDate)}</span>
                      </div>
                      
                      <p className="mt-3 text-gray-600 line-clamp-2">
                        {job.description}
                      </p>
                      
                      <div className="mt-4 flex items-center space-x-4 text-sm">
                        <div className="flex items-center text-gray-500">
                          <DollarSign className="h-4 w-4 mr-1" />
                          <span>{formatSalary(job.salary)}</span>
                        </div>
                        <div className="flex items-center text-gray-500">
                          <Users className="h-4 w-4 mr-1" />
                          <span>{job.experienceLevel} level</span>
                        </div>
                      </div>
                      
                      {job.skills && job.skills.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {job.skills.slice(0, 5).map((skill, index) => (
                            <span
                              key={index}
                              className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded"
                            >
                              {skill}
                            </span>
                          ))}
                          {job.skills.length > 5 && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                              +{job.skills.length - 5} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="ml-6 flex-shrink-0">
                      {job.hasApplied ? (
                        <span className="inline-flex px-4 py-2 text-sm font-medium text-gray-500 bg-gray-100 rounded-md">
                          Applied
                        </span>
                      ) : (
                        <button
                          onClick={() => handleApply(job._id)}
                          className="inline-flex px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Apply Now
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CandidateJobs;
