import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Plus, Building, MapPin, Clock, DollarSign, Users, Eye, Edit, Trash2 } from 'lucide-react';

const CompanyDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({
    totalJobs: 0,
    totalApplications: 0,
    shortlistedCandidates: 0
  });

  useEffect(() => {
    fetchJobs();
    fetchApplications();
    fetchStats();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/companies/jobs', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setJobs(data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const fetchApplications = async () => {
    try {
      const response = await fetch('/api/companies/applications', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setApplications(data);
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/companies/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const deleteJob = async (jobId) => {
    if (!window.confirm('Are you sure you want to delete this job posting?')) {
      return;
    }

    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        fetchJobs();
        fetchStats();
      }
    } catch (error) {
      console.error('Error deleting job:', error);
    }
  };

  const updateApplicationStatus = async (applicationId, status) => {
    try {
      const response = await fetch(`/api/companies/applications/${applicationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        fetchApplications();
        fetchStats();
      }
    } catch (error) {
      console.error('Error updating application status:', error);
    }
  };

  const formatSalary = (salary) => {
    return salary >= 1000 ? `$${(salary / 1000).toFixed(0)}k` : `$${salary}`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {user?.companyName} Dashboard
              </h1>
              <p className="mt-2 text-gray-600">
                Manage your job postings and review applications
              </p>
            </div>
            <button
              onClick={() => window.location.href = '/company/jobs/new'}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Post New Job
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Building className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Active Jobs
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalJobs}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Applications
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalApplications}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Eye className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Shortlisted
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.shortlistedCandidates}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Job Postings */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Recent Job Postings</h2>
            </div>
            <div className="p-6">
              {jobs.length === 0 ? (
                <div className="text-center py-6">
                  <Building className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No job postings</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by creating your first job posting.
                  </p>
                  <button
                    onClick={() => window.location.href = '/company/jobs/new'}
                    className="mt-3 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Post Job
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {jobs.slice(0, 5).map((job) => (
                    <div key={job._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900">
                            {job.title}
                          </h3>
                          <div className="mt-1 flex items-center text-xs text-gray-500">
                            <MapPin className="h-3 w-3 mr-1" />
                            <span className="mr-3">{job.location}</span>
                            <DollarSign className="h-3 w-3 mr-1" />
                            <span className="mr-3">{formatSalary(job.salary)}</span>
                            <Clock className="h-3 w-3 mr-1" />
                            <span>{formatDate(job.postedDate)}</span>
                          </div>
                          <div className="mt-2 flex items-center">
                            <span className="text-xs text-gray-500">
                              {job.applicationCount || 0} applications
                            </span>
                            <span className={`ml-3 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              job.status === 'active' ? 'bg-green-100 text-green-800' :
                              job.status === 'closed' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {job.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => window.location.href = `/company/jobs/${job._id}`}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => window.location.href = `/company/jobs/${job._id}/edit`}
                            className="text-gray-600 hover:text-gray-800"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteJob(job._id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Applications */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Recent Applications</h2>
            </div>
            <div className="p-6">
              {applications.length === 0 ? (
                <div className="text-center py-6">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No applications</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Applications will appear here once candidates start applying.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {applications.slice(0, 5).map((application) => (
                    <div key={application._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <h3 className="text-sm font-medium text-gray-900">
                              {application.candidate.firstName} {application.candidate.lastName}
                            </h3>
                            <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              application.status === 'applied' ? 'bg-blue-100 text-blue-800' :
                              application.status === 'interview' ? 'bg-yellow-100 text-yellow-800' :
                              application.status === 'shortlisted' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {application.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            Applied for: {application.job.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(application.appliedDate)}
                          </p>
                          {application.matchScore && (
                            <p className="text-xs text-green-600">
                              Match Score: {Math.round(application.matchScore)}%
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col space-y-1">
                          {application.status === 'applied' && (
                            <>
                              <button
                                onClick={() => updateApplicationStatus(application._id, 'shortlisted')}
                                className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                              >
                                Shortlist
                              </button>
                              <button
                                onClick={() => updateApplicationStatus(application._id, 'rejected')}
                                className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {application.status === 'shortlisted' && (
                            <button
                              onClick={() => updateApplicationStatus(application._id, 'interview')}
                              className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                            >
                              Interview
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDashboard;
