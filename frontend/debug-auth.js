// Test authentication in browser console
// Run this in the browser developer console to debug auth issues

console.log('=== Authentication Debug ===');
console.log('Token:', localStorage.getItem('authToken'));
console.log('User:', localStorage.getItem('user'));

// Try to parse user data
try {
  const userData = JSON.parse(localStorage.getItem('user') || '{}');
  console.log('Parsed user data:', userData);
  console.log('User role:', userData.role);
  console.log('User email:', userData.email);
} catch (e) {
  console.error('Error parsing user data:', e);
}

// Test API call directly
if (localStorage.getItem('authToken')) {
  fetch('http://localhost:5000/api/jobs/company/my-jobs', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => response.json())
  .then(data => {
    console.log('Direct API test result:', data);
    if (data.success) {
      console.log('✅ API call successful');
      console.log('Jobs count:', data.data?.jobs?.length || 0);
    } else {
      console.log('❌ API call failed:', data.message);
    }
  })
  .catch(error => {
    console.error('❌ API call error:', error);
  });
} else {
  console.log('❌ No token found');
}