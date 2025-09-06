import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Upload, FileText, Eye, Download, Trash2, Plus } from 'lucide-react';

const CandidateDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const [resumes, setResumes] = useState([]);
  const [applications, setApplications] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // Fetch candidate's resumes and applications
    fetchResumes();
    fetchApplications();
  }, []);

  const fetchResumes = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/resumes', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      // Handle API response structure properly
      if (data.success && Array.isArray(data.resumes)) {
        setResumes(data.resumes);
      } else if (Array.isArray(data)) {
        setResumes(data);
      } else {
        setResumes([]); // Fallback to empty array
      }
    } catch (error) {
      console.error('Error fetching resumes:', error);
      setResumes([]); // Ensure resumes is always an array
    }
  };

  const fetchApplications = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/candidates/applications', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      // Handle API response structure properly
      if (data.success && Array.isArray(data.applications)) {
        setApplications(data.applications);
      } else if (Array.isArray(data)) {
        setApplications(data);
      } else {
        setApplications([]); // Fallback to empty array
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      setApplications([]); // Ensure applications is always an array
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('resume', uploadFile);

    try {
      const response = await fetch('/api/resumes/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
          // DO NOT set Content-Type - let browser set multipart/form-data automatically
        },
        body: formData
      });

      const responseData = await response.text();

      if (response.ok) {
        setUploadFile(null);
        fetchResumes();
        alert('Resume uploaded successfully!');
      } else {
        console.error('Upload failed:', responseData);
        alert(`Upload failed: ${responseData}`);
      }
    } catch (error) {
      console.error('Error uploading resume:', error);
      alert(`Upload error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const deleteResume = async (resumeId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/resumes/${resumeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        fetchResumes();
      }
    } catch (error) {
      console.error('Error deleting resume:', error);
    }
  };

  const handleViewResume = async (resumeId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/resumes/view/${resumeId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        // Clean up the object URL after a delay
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      } else {
        alert('Error viewing resume: ' + response.statusText);
      }
    } catch (error) {
      console.error('Error viewing resume:', error);
      alert('Error viewing resume: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="mt-2 text-gray-600">
            Manage your resumes and track your job applications
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Resumes
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {Array.isArray(resumes) ? resumes.length : 0}
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
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Applications
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {Array.isArray(applications) ? applications.length : 0}
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
                      Profile Views
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {user?.profileViews || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Resume Management */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">My Resumes</h2>
            </div>
            <div className="p-6">
              {/* Upload Form */}
              <form onSubmit={handleFileUpload} className="mb-6">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => setUploadFile(e.target.files[0])}
                      className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!uploadFile || uploading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {uploading ? (
                      'Uploading...'
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Resume List */}
              <div className="space-y-3">
                {!Array.isArray(resumes) || resumes.length === 0 ? (
                  <div className="text-center py-6">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No resumes</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Get started by uploading your first resume.
                    </p>
                  </div>
                ) : (
                  resumes.map((resume) => (
                    <div key={resume._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {resume.filename}
                          </p>
                          <p className="text-xs text-gray-500">
                            Uploaded {new Date(resume.uploadDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewResume(resume._id)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteResume(resume._id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Recent Applications */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Recent Applications</h2>
            </div>
            <div className="p-6">
              {!Array.isArray(applications) || applications.length === 0 ? (
                <div className="text-center py-6">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No applications</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Start applying to jobs to track your progress here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {applications.slice(0, 5).map((application) => (
                    <div key={application._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">
                            {application.job?.title}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {application.job?.company?.companyName}
                          </p>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          application.status === 'applied' ? 'bg-blue-100 text-blue-800' :
                          application.status === 'interview' ? 'bg-yellow-100 text-yellow-800' :
                          application.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {application.status}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        Applied {new Date(application.appliedDate).toLocaleDateString()}
                      </p>
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

export default CandidateDashboard;
