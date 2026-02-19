import React from 'react'
import Button from './ui/Button'
import StarRating from './ui/StarRating'
import Container from './ui/Container'

const HeroSection = () => {
  return (
    <Container className="py-6 sm:pt-8 lg:pt-10">
      <div className="text-center mb-4 sm:mb-6 lg:mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-primary mb-4 sm:mb-6 leading-tight px-4">
          AI-Powered Mock Interviews<br />
          <span className="text-secondary">& Smarter Hiring.</span>
        </h1>
        
        <p className="text-sm sm:text-base lg:text-lg text-text-light mb-6 sm:mb-8 max-w-xs sm:max-w-md lg:max-w-lg mx-auto px-4">
          Faster candidate shortlisting and smarter interview insights - powered by AI.
        </p>
        
        <div className="flex  sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-8 sm:mb-12 px-4">
          <Button variant="secondary" size="lg" className="sm:size-lg w-full sm:w-auto">
            Get Started
          </Button>
          <Button variant="outline" size="lg" className="sm:size-lg w-full sm:w-auto">
            Watch Demo
          </Button>
        </div>
        
        <StarRating rating={5.0} reviews="80+" />
      </div>
      
      {/* Cards Section - Responsive Layout */}
      <div className="flex flex-col lg:flex-row items-center justify-center lg:justify-between px-2 sm:px-4  gap-4 sm:gap-6 lg:gap-8 xl:gap-12">
        {/* Card 1 - Hero Image */}
        <div className="border border-gray-300 rounded-4xl w-full  lg:w-[17%] h-48 sm:h-60 lg:h-70 bg-[#DFDFDF] relative lg:-top-16 order-1">
            <img src="/hero.png" alt="Hero illustration" className='h-full w-full object-cover rounded-4xl' />
        </div>
        
        {/* Card 2 - 50% Faster Hiring */}
        <div className="flex flex-col items-center justify-center rounded-4xl w-full  lg:w-[14%] h-40 sm:h-48 lg:h-54 bg-[#003566] relative lg:-top-8 order-2">
            <p className='text-white text-xl sm:text-2xl lg:text-2xl font-bold'>50%</p>
            <p className='text-[#DFDFDF] font-light text-sm sm:text-lg lg:text-xl text-center px-2'>Faster Hiring</p>
        </div>
        
        {/* Card 3 - 1000+ Interviews */}
        <div className="rounded-4xl w-full  lg:w-[20%] h-32 sm:h-36 lg:h-38 bg-[#FFFFFF] relative shadow-sm order-3">
           <span className='absolute top-2 sm:top-4 right-2 sm:right-4'>
             <img src="/image2.png" alt="Background icon" className='w-6 h-6 sm:w-8 sm:h-8 lg:w-9 lg:h-9' />
           </span>
           <div className='flex flex-col mt-4 sm:mt-6 lg:mt-7 ml-3 sm:ml-4'>
            <img src="/image1.png" className='w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12' alt="User icon" /> 
            <p className='text-lg sm:text-xl font-semibold mt-1'>1000+</p>
            <p className='text-sm sm:text-base lg:text-lg'>Interviews conducted</p>
           </div>
        </div>
        
        {/* Card 4 - 50% Candidate Satisfaction */}
        <div className="bg-[#00356633] flex flex-col items-center justify-center rounded-4xl w-full  lg:w-[14%] h-40 sm:h-48 lg:h-54 relative lg:-top-8 order-4">
            <p className='text-black text-xl sm:text-2xl lg:text-2xl font-bold'>50%</p>
            <p className='text-black/70 font-light text-sm sm:text-lg lg:text-xl max-w-[80%] sm:max-w-[70%] text-center px-2'>Candidate Satisfaction</p>
        </div>
        
        {/* Card 5 - Practice Card */}
        <div className="rounded-4xl w-full flex items-center justify-center lg:w-[17%] h-48 sm:h-60 lg:h-70 bg-[#003566] relative lg:-top-16 order-5">
            <div className='flex lg:flex-col items-center justify-center  lg:absolute lg:bottom-4  gap-1 lg:left-8'>
                <img src="/card.png" className='w-8 h-6 sm:w-10 sm:h-7 lg:w-12 lg:h-9' alt="Card icon" />
                <p className='text-sm sm:text-lg lg:text-xl font-semibold text-white max-w-[80%] sm:max-w-[70%] lg:max-w-[60%] leading-tight'>
                  Practice.<br />
                  Perform.<br />
                  Get Hired.
                </p>
            </div>
        </div>
      </div>
    </Container>
  )
}

export default HeroSection