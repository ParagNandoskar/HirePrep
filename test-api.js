// Node.js 18+ has built-in fetch support
const API_BASE = 'http://localhost:5000/api';

// You'll need to replace this with an actual token from localStorage
const CANDIDATE_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ZmYyMmM5MDFhOWVmM2QwNzgzOWI1OSIsInJvbGUiOiJzdHVkZW50IiwiaWF0IjoxNzcyMDMyNDE3LCJqdGkiOiIzMzAxNTIwMjY4MDk3NGU5MDkxNWM4YTUyYTUwOTM2YyIsImV4cCI6MTc3MjExODgxNywiYXVkIjoiaGlyZXByZXAtY2xpZW50IiwiaXNzIjoiaGlyZXByZXAtYXBpIn0.fX1s8biHVVQMQkLYTh_AhOkhwriZoOEJ9fGCM2FfYK8';
const EMPLOYER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MDQzODc1NDA3ZjllMGVhOWRlNmQ5MCIsInJvbGUiOiJjb21wYW55IiwiaWF0IjoxNzcyMDMxNTM1LCJqdGkiOiJhOGEzMTY3NzVkMjQzYmUxMjVmYzdlNDJhZGJmMmFjNyIsImV4cCI6MTc3MjExNzkzNSwiYXVkIjoiaGlyZXByZXAtY2xpZW50IiwiaXNzIjoiaGlyZXByZXAtYXBpIn0.FVNDz978VOwNBgb6ud2x2QKIdvJphuvzZaZ2vDGaHmk';

async function testCandidateDashboard() {
  console.log('\n=== Testing Candidate Dashboard ===\n');
  
  try {
    // Test dashboard stats
    const statsRes = await fetch(`${API_BASE}/candidates/dashboard-stats`, {
      headers: { 'Authorization': `Bearer ${CANDIDATE_TOKEN}` }
    });
    const stats = await statsRes.json();
    console.log('Dashboard Stats:', JSON.stringify(stats, null, 2));
    
    // Test applications
    const appsRes = await fetch(`${API_BASE}/candidates/applications`, {
      headers: { 'Authorization': `Bearer ${CANDIDATE_TOKEN}` }
    });
    const apps = await appsRes.json();
    console.log('\nApplications:', JSON.stringify(apps, null, 2));
    
  } catch (error) {
    console.error('Error testing candidate dashboard:', error.message);
  }
}

async function testEmployerDashboard() {
  console.log('\n=== Testing Employer Dashboard ===\n');
  
  try {
    // Test dashboard stats
    const statsRes = await fetch(`${API_BASE}/companies/dashboard-stats`, {
      headers: { 'Authorization': `Bearer ${EMPLOYER_TOKEN}` }
    });
    const stats = await statsRes.json();
    console.log('Dashboard Stats:', JSON.stringify(stats, null, 2));
    
    // Test my jobs
    const jobsRes = await fetch(`${API_BASE}/jobs/company/my-jobs`, {
      headers: { 'Authorization': `Bearer ${EMPLOYER_TOKEN}` }
    });
    const jobs = await jobsRes.json();
    console.log('\nMy Jobs:', JSON.stringify(jobs, null, 2));
    
  } catch (error) {
    console.error('Error testing employer dashboard:', error.message);
  }
}

// Instructions
console.log(`
To test the APIs:
1. Open browser DevTools (F12)
2. Go to Console
3. Type: localStorage.getItem('authToken')
4. Copy the token value
5. Replace CANDIDATE_TOKEN and EMPLOYER_TOKEN in this file
6. Run: node test-api.js
`);

// Uncomment these when you have tokens
testCandidateDashboard();
testEmployerDashboard();
