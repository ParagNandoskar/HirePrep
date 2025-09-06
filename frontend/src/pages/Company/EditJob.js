import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { MapPin, DollarSign, Clock, Building, Users, Tag } from 'lucide-react';

const EditJob = () => {
  const { id } = useParams();
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [jobLoading, setJobLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    location: '',
    jobType: 'full-time',
    experienceLevel: 'mid',
    salary: '',
    skills: '',
    department: '',
    benefits: ''
  });

  useEffect(() => {
    fetchJobData();
  }, [id]);

  const fetchJobData = async () => {
    try {
      setJobLoading(true);
      const response = await fetch(`/api/jobs/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const jobData = await response.json();
        
        // Transform backend data to form format
        setFormData({
          title: jobData.title || '',
          description: jobData.description || '',
          requirements: Array.isArray(jobData.requirements?.skills) 
            ? jobData.requirements.skills.map(skill => skill.name || skill).join('\n')
            : '',
          location: formatLocationForEdit(jobData.location),
          jobType: jobData.jobDetails?.type || 'full-time',
          experienceLevel: jobData.jobDetails?.level || 'mid',
          salary: jobData.compensation?.salaryRange?.min || jobData.salary || '',
          skills: Array.isArray(jobData.requirements?.skills)
            ? jobData.requirements.skills.map(skill => skill.name || skill).join(', ')
            : '',
          department: jobData.jobDetails?.department || '',
          benefits: Array.isArray(jobData.compensation?.benefits)
            ? jobData.compensation.benefits.join('\n')
            : ''
        });
      } else {
        alert('Failed to load job data');
        navigate('/company/dashboard');
      }
    } catch (error) {
      console.error('Error fetching job:', error);
      alert('Error loading job data');
      navigate('/company/dashboard');
    } finally {
      setJobLoading(false);
    }
  };

  const formatLocationForEdit = (location) => {
    if (typeof location === 'string') {
      return location;
    }
    if (location && typeof location === 'object') {
      const parts = [location.city, location.state, location.country].filter(Boolean);
      return parts.length > 0 ? parts.join(', ') : location.type || '';
    }
    return '';
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Transform frontend data to match backend schema
      const skillsArray = formData.skills.split(',').map(skill => skill.trim()).filter(skill => skill);
      const requirementsArray = formData.requirements.split('\n').filter(req => req.trim());
      const benefitsArray = formData.benefits.split('\n').filter(benefit => benefit.trim());

      const jobData = {
        title: formData.title,
        description: formData.description,
        requirements: {
          skills: skillsArray.map(skill => ({
            name: skill,
            level: 'Intermediate',
            isRequired: true,
            weight: 5
          })),
          education: {
            minimumLevel: 'Bachelor',
            isRequired: true
          },
          experience: {
            minimumYears: formData.experienceLevel === 'entry' ? 0 : 
                          formData.experienceLevel === 'mid' ? 2 : 
                          formData.experienceLevel === 'senior' ? 5 : 8,
            maximumYears: formData.experienceLevel === 'entry' ? 2 : 
                          formData.experienceLevel === 'mid' ? 5 : 
                          formData.experienceLevel === 'senior' ? 10 : 20
          }
        },
        jobDetails: {
          type: formData.jobType,
          level: formData.experienceLevel,
          department: formData.department || 'General'
        },
        compensation: {
          salaryRange: {
            min: parseInt(formData.salary) * 0.9,
            max: parseInt(formData.salary) * 1.1,
            currency: 'USD'
          },
          benefits: benefitsArray,
          bonus: 'None'
        },
        location: {
          type: formData.location.toLowerCase().includes('remote') ? 'remote' : 'on-site',
          city: formData.location.includes(',') ? formData.location.split(',')[0].trim() : formData.location,
          state: formData.location.includes(',') ? formData.location.split(',')[1]?.trim() : '',
          country: 'USA'
        }
      };

      const response = await fetch(`/api/jobs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(jobData)
      });

      const responseData = await response.json();

      if (response.ok) {
        alert('Job updated successfully!');
        navigate('/company/dashboard');
      } else {
        console.error('Error updating job:', responseData);
        alert(`Error: ${responseData.message || 'Failed to update job'}`);
      }
    } catch (error) {
      console.error('Error updating job:', error);
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (jobLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading job data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900">Edit Job Posting</h1>
          <p className="mt-2 text-gray-600">
            Update your job posting details
          </p>
        </div>

        {/* Form */}
        <div className="bg-white shadow rounded-lg">
          <form onSubmit={handleSubmit} className="space-y-6 p-6">
            {/* Job Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Job Title *
              </label>
              <div className="mt-1 relative">
                <input
                  type="text"
                  id="title"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g. Senior Software Engineer"
                  className="block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <Building className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Location */}
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                  Location *
                </label>
                <div className="mt-1 relative">
                  <input
                    type="text"
                    id="location"
                    name="location"
                    required
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="e.g. San Francisco, CA or Remote"
                    className="block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
              </div>

              {/* Salary */}
              <div>
                <label htmlFor="salary" className="block text-sm font-medium text-gray-700">
                  Annual Salary (USD) *
                </label>
                <div className="mt-1 relative">
                  <input
                    type="number"
                    id="salary"
                    name="salary"
                    required
                    value={formData.salary}
                    onChange={handleChange}
                    placeholder="e.g. 120000"
                    className="block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Job Type */}
              <div>
                <label htmlFor="jobType" className="block text-sm font-medium text-gray-700">
                  Job Type *
                </label>
                <div className="mt-1 relative">
                  <select
                    id="jobType"
                    name="jobType"
                    required
                    value={formData.jobType}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="full-time">Full Time</option>
                    <option value="part-time">Part Time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </select>
                  <Clock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
              </div>

              {/* Experience Level */}
              <div>
                <label htmlFor="experienceLevel" className="block text-sm font-medium text-gray-700">
                  Experience Level *
                </label>
                <div className="mt-1 relative">
                  <select
                    id="experienceLevel"
                    name="experienceLevel"
                    required
                    value={formData.experienceLevel}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="entry">Entry Level</option>
                    <option value="mid">Mid Level</option>
                    <option value="senior">Senior Level</option>
                    <option value="executive">Executive</option>
                  </select>
                  <Users className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
              </div>

              {/* Department */}
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                  Department
                </label>
                <input
                  type="text"
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="e.g. Engineering"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Job Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Job Description *
              </label>
              <textarea
                id="description"
                name="description"
                required
                rows={6}
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the role, responsibilities, and what the candidate will be working on..."
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Requirements */}
            <div>
              <label htmlFor="requirements" className="block text-sm font-medium text-gray-700">
                Requirements *
              </label>
              <textarea
                id="requirements"
                name="requirements"
                required
                rows={4}
                value={formData.requirements}
                onChange={handleChange}
                placeholder="List each requirement on a new line:
Bachelor's degree in Computer Science
3+ years of experience with React
Experience with Node.js"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Enter each requirement on a separate line
              </p>
            </div>

            {/* Skills */}
            <div>
              <label htmlFor="skills" className="block text-sm font-medium text-gray-700">
                Required Skills *
              </label>
              <div className="mt-1 relative">
                <input
                  type="text"
                  id="skills"
                  name="skills"
                  required
                  value={formData.skills}
                  onChange={handleChange}
                  placeholder="React, Node.js, MongoDB, JavaScript, TypeScript"
                  className="block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <Tag className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Separate skills with commas
              </p>
            </div>

            {/* Benefits */}
            <div>
              <label htmlFor="benefits" className="block text-sm font-medium text-gray-700">
                Benefits & Perks
              </label>
              <textarea
                id="benefits"
                name="benefits"
                rows={3}
                value={formData.benefits}
                onChange={handleChange}
                placeholder="List each benefit on a new line:
Health insurance
401k matching
Flexible work hours
Remote work options"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Enter each benefit on a separate line
              </p>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/company/dashboard')}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating...' : 'Update Job'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditJob;
