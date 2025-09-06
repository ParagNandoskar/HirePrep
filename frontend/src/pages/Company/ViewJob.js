import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowLeft, MapPin, DollarSign, Clock, Building, Users, Tag, Edit, Trash2 } from 'lucide-react';

const ViewJob = () => {
  const { id } = useParams();
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobData();
  }, [id]);

  const fetchJobData = async () => {
    try {
      const response = await fetch(`/api/jobs/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const jobData = await response.json();
        setJob(jobData);
      } else {
        alert('Failed to load job data');
        navigate('/company/dashboard');
      }
    } catch (error) {
      console.error('Error fetching job:', error);
      alert('Error loading job data');
      navigate('/company/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const deleteJob = async () => {
    if (!window.confirm('Are you sure you want to delete this job posting?')) {
      return;
    }

    try {
      const response = await fetch(`/api/jobs/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        alert('Job deleted successfully!');
        navigate('/company/dashboard');
      } else {
        alert('Failed to delete job');
      }
    } catch (error) {
      console.error('Error deleting job:', error);
      alert('Error deleting job');
    }
  };

  const formatLocation = (location) => {
    if (typeof location === 'string') {
      return location;
    }
    if (location && typeof location === 'object') {
      const parts = [location.city, location.state, location.country].filter(Boolean);
      return parts.length > 0 ? parts.join(', ') : location.type || 'Not specified';
    }
    return 'Not specified';
  };

  const formatSalary = (compensation) => {
    if (compensation?.salaryRange) {
      const { min, max, currency = 'USD' } = compensation.salaryRange;
      const minFormatted = min >= 1000 ? `${(min / 1000).toFixed(0)}k` : min;
      const maxFormatted = max >= 1000 ? `${(max / 1000).toFixed(0)}k` : max;
      return `$${minFormatted} - $${maxFormatted} ${currency}`;
    }
    return 'Not specified';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Job not found</h2>
          <p className="mt-2 text-gray-600">The job you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate('/company/dashboard')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/company/dashboard')}
                className="mr-4 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
                <p className="mt-2 text-gray-600">
                  Posted on {new Date(job.postedDate).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            {user?.role === 'company' && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigate(`/company/jobs/${job._id}/edit`)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </button>
                <button
                  onClick={deleteJob}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Job Details */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                {formatLocation(job.location)}
              </div>
              <div className="flex items-center">
                <DollarSign className="h-4 w-4 mr-1" />
                {formatSalary(job.compensation)}
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {job.jobDetails?.type || 'Not specified'}
              </div>
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                {job.jobDetails?.level || 'Not specified'} level
              </div>
              <div className="flex items-center">
                <Building className="h-4 w-4 mr-1" />
                {job.jobDetails?.department || 'General'}
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Description */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Job Description</h3>
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
              </div>
            </div>

            {/* Requirements */}
            {job.requirements && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Requirements</h3>
                {job.requirements.skills && job.requirements.skills.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-md font-medium text-gray-800 mb-2">Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {job.requirements.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                        >
                          {typeof skill === 'string' ? skill : skill.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {job.requirements.experience && (
                  <div className="mb-4">
                    <h4 className="text-md font-medium text-gray-800 mb-2">Experience</h4>
                    <p className="text-gray-700">
                      {job.requirements.experience.minimumYears 
                        ? `${job.requirements.experience.minimumYears}+ years of experience required`
                        : 'Experience requirements not specified'
                      }
                    </p>
                  </div>
                )}

                {job.requirements.education && (
                  <div className="mb-4">
                    <h4 className="text-md font-medium text-gray-800 mb-2">Education</h4>
                    <p className="text-gray-700">
                      {job.requirements.education.minimumLevel 
                        ? `${job.requirements.education.minimumLevel} degree required`
                        : 'Education requirements not specified'
                      }
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Benefits */}
            {job.compensation?.benefits && job.compensation.benefits.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Benefits & Perks</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  {job.compensation.benefits.map((benefit, index) => (
                    <li key={index}>{benefit}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Analytics */}
            {job.analytics && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Job Analytics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{job.analytics.views || 0}</div>
                    <div className="text-sm text-gray-500">Views</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{job.analytics.applications || 0}</div>
                    <div className="text-sm text-gray-500">Applications</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{job.analytics.shortlisted || 0}</div>
                    <div className="text-sm text-gray-500">Shortlisted</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{job.analytics.hired || 0}</div>
                    <div className="text-sm text-gray-500">Hired</div>
                  </div>
                </div>
              </div>
            )}

            {/* Status */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Status</h3>
                  <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                    job.status === 'active' ? 'bg-green-100 text-green-800' :
                    job.status === 'closed' ? 'bg-red-100 text-red-800' :
                    job.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {job.status || 'draft'}
                  </span>
                </div>
                
                {user?.role === 'company' && (
                  <button
                    onClick={() => navigate(`/company/jobs/${job._id}/applications`)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    View Applications ({job.analytics?.applications || 0})
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewJob;
