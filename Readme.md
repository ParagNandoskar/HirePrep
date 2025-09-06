# HirePrep - AI-Powered Resume Screening System

## 🚀 Quick Start

### Prerequisites
- Node.js (v16+)
- MongoDB
- Python 3.8+

### Setup & Run

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hireprep
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm start
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm start
   ```

4. **NLP Service Setup**
   ```bash
   cd nlp-service
   pip install -r requirements.txt
   cp .env.example .env
   python app.py
   ```

## ✅ Recent Fixes Completed

### Job Posting Functionality
- ✅ **Post New Job**: Fixed schema mismatch and navigation
- ✅ **Edit Job**: Created EditJob component with proper data transformation
- ✅ **View Job**: Created ViewJob component for job details
- ✅ **Delete Job**: Enhanced error handling and user feedback

### Navigation & Routes
- ✅ **Fixed Navigation**: Replaced window.location.href with React Router
- ✅ **Added Routes**: /company/jobs/:id and /company/jobs/:id/edit
- ✅ **Protected Routes**: Proper authentication for company-only routes

### Data Display
- ✅ **Fixed Object Rendering**: Location and salary objects now display properly
- ✅ **Safety Checks**: Added null/undefined checks for all data fields
- ✅ **Error Boundary**: Created reusable error boundary component

### Backend Improvements
- ✅ **Rate Limiting**: Increased limits for development (1000 req/15min)
- ✅ **Environment Files**: Created .env files for all services
- ✅ **Error Handling**: Better error messages and status codes

## 🧪 Testing the Job Management Features

### 1. Post New Job
1. Login as company user
2. Go to Company Dashboard
3. Click "Post New Job"
4. Fill out form and submit
5. Should redirect to dashboard with new job listed

### 2. Edit Job
1. From Company Dashboard
2. Click Edit (pencil) icon on any job
3. Modify job details
4. Click "Update Job"
5. Should redirect back with updated data

### 3. View Job
1. From Company Dashboard  
2. Click View (eye) icon on any job
3. See detailed job information
4. Can edit or delete from this view

### 4. Delete Job
1. From Dashboard or Job View
2. Click Delete (trash) icon
3. Confirm deletion
4. Job should be removed from list

## 🔧 Architecture

### Frontend (React)
- `CompanyDashboard.js` - Main dashboard with job listings
- `PostJob.js` - Create new job postings
- `EditJob.js` - Edit existing jobs
- `ViewJob.js` - View job details
- Error boundaries and protected routes

### Backend (Node.js/Express)
- Job CRUD operations with proper authentication
- Company-specific job access control
- Data validation and error handling

### Database (MongoDB)
- Nested job schema with location, compensation, requirements
- Company-job relationships
- Application tracking

## 📝 API Endpoints

### Jobs
- `GET /api/jobs` - Get all jobs (public)
- `GET /api/jobs/:id` - Get single job
- `POST /api/jobs` - Create job (company only)
- `PUT /api/jobs/:id` - Update job (company only)
- `DELETE /api/jobs/:id` - Delete job (company only)
- `GET /api/jobs/company/my-jobs` - Get company's jobs

### Companies
- `GET /api/companies/stats` - Dashboard statistics
- `GET /api/companies/applications` - Recent applications
- `PATCH /api/companies/applications/:id` - Update application status

## 🐛 Troubleshooting

### Common Issues
1. **Rate Limit Errors**: Backend rate limiting - restart backend
2. **Token Errors**: Clear localStorage and re-login
3. **Navigation Issues**: Hard refresh the page
4. **MongoDB Errors**: Ensure MongoDB is running

### Development Tips
- Use React DevTools for debugging
- Check browser console for errors
- Monitor backend terminal for API errors
- Use MongoDB Compass for database inspection