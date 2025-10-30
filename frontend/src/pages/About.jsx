import React from 'react'
import Container from '../components/ui/Container'

const About = () => {
  return (
    <Container className="py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-800 mb-8 text-center">About HirePrep</h1>
        <div className="prose prose-lg mx-auto">
          <p className="text-lg text-gray-600 mb-6">
            HirePrep revolutionizes the hiring process through AI-powered mock interviews and intelligent candidate assessment tools.
          </p>
          <p className="text-gray-600 mb-6">
            Our platform combines cutting-edge artificial intelligence with proven interview methodologies to help both candidates and employers achieve better outcomes in the hiring process.
          </p>
          <div className="grid md:grid-cols-2 gap-8 mt-12">
            <div>
              <h3 className="text-xl font-semibold mb-4">For Candidates</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• AI-powered mock interviews</li>
                <li>• Real-time feedback and scoring</li>
                <li>• Industry-specific practice scenarios</li>
                <li>• Performance analytics and insights</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">For Employers</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Automated candidate screening</li>
                <li>• Consistent evaluation criteria</li>
                <li>• Reduced time-to-hire</li>
                <li>• Data-driven hiring decisions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}

export default About