import React from 'react'
import Container from '../components/ui/Container'
import Card from '../components/ui/Card'

const Features = () => {
  const features = [
    {
      title: 'AI-Powered Interviews',
      description: 'Advanced AI technology conducts realistic mock interviews tailored to your industry and role.',
      icon: '🤖'
    },
    {
      title: 'Real-time Feedback',
      description: 'Get instant feedback on your performance, including speech patterns, confidence levels, and answer quality.',
      icon: '⚡'
    },
    {
      title: 'Performance Analytics',
      description: 'Track your progress over time with detailed analytics and personalized improvement recommendations.',
      icon: '📈'
    },
    {
      title: 'Industry-Specific Scenarios',
      description: 'Practice with questions and scenarios specific to your target industry and job role.',
      icon: '🎯'
    },
    {
      title: 'Automated Screening',
      description: 'Employers can automate initial candidate screening with consistent evaluation criteria.',
      icon: '🔍'
    },
    {
      title: 'Smart Insights',
      description: 'Get data-driven insights to make better hiring decisions and improve candidate experience.',
      icon: '💡'
    }
  ]

  return (
    <Container className="py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-slate-800 mb-6">Features</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Discover how HirePrep's advanced features can transform your interview and hiring experience.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((feature, index) => (
          <Card key={index}>
            <div className="text-4xl mb-4">{feature.icon}</div>
            <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
            <p className="text-gray-600">{feature.description}</p>
          </Card>
        ))}
      </div>
    </Container>
  )
}

export default Features