import { MdOutlineDocumentScanner } from "react-icons/md";

const FeaturesSection = () => {
  return (
    <div className='min-h-screen w-full bg-[#DFDFDF]'>
        <div className='flex flex-col items-center justify-center py-16 mx-10 '>
            <div className='flex flex-col items-center justify-center gap-4'>
                <h3 className='font-semibold text-3xl text-center '>Smarter Features for Smarter Interviews</h3>
                <p className='text-xl text-center font-light text-[#6C757D] max-w-2/3'>AI-powered tools that transform resume screening, mock interviews, and candidate evaluation.</p>
            </div>
            <div className="flex flex-wrap items-center justify-center  gap-14 mt-12 w-full max-w-7xl">
                {/* Card 1 */}
                <div className="bg-secondary text-white p-6 flex flex-col justify-center opacity-100 gap-2" style={{width: '344px', height: '253px', borderRadius: '30px'}}>
                    <MdOutlineDocumentScanner className="text-2xl " />
                    <p className="text-md" >Resume Screening</p>
                    <p className="text-sm text-white/70">AI-powered NLP parsing extracts skills, education, and experience to match candidates with job roles instantly.</p>
                </div>

                {/* Card 2 */}
                <div className="bg-secondary text-white p-6 flex flex-col justify-center opacity-100 gap-2" style={{width: '344px', height: '253px', borderRadius: '30px'}}>
                    <MdOutlineDocumentScanner className="text-2xl " />
                    <p className="text-md" >AI-Generated Questions</p>
                    <p className="text-sm text-white/70">Adaptive interview questions tailored to each candidate’s profile and the job description.</p>
                </div>

                {/* Card 3 */}
                <div className="bg-secondary text-white p-6 flex flex-col justify-center opacity-100 gap-2" style={{width: '344px', height: '253px', borderRadius: '30px'}}>
                    <MdOutlineDocumentScanner className="text-2xl " />
                    <p className="text-md" >Video & Expression Analysis</p>
                    <p className="text-sm text-white/70">Track facial expressions, eye movement, and body posture to evaluate confidence and focus.</p>
                </div>
                {/* Card 4 */}
                <div className="bg-secondary text-white p-6 flex flex-col justify-center opacity-100 gap-2" style={{width: '344px', height: '253px', borderRadius: '30px'}}>
                    <MdOutlineDocumentScanner className="text-2xl " />
                    <p className="text-md" >Speech & Communication Feedback </p>
                    <p className="text-sm text-white/70">AI-driven speech analysis checks clarity, tone, and filler words to improve communication.</p>
                </div>
                {/* Card 5 */}
                <div className="bg-secondary text-white p-6 flex flex-col justify-center opacity-100 gap-2" style={{width: '344px', height: '253px', borderRadius: '30px'}}>
                    <MdOutlineDocumentScanner className="text-2xl " />
                    <p className="text-md" >Shortlisting & Insights for Companies</p>
                    <p className="text-sm text-white/70">Generate unbiased top-10 candidate lists with interview recordings, resume match scores, and AI evaluation.</p>
                </div>
                {/* Card 6 */}
                <div className="bg-secondary text-white p-6 flex flex-col justify-center opacity-100 gap-2" style={{width: '344px', height: '253px', borderRadius: '30px'}}>
                    <MdOutlineDocumentScanner className="text-2xl " />
                    <p className="text-md" >Personalized Reports</p>
                    <p className="text-sm text-white/70">Every candidate gets a detailed report with strengths, weaknesses, and improvement tips.</p>
                </div>
            </div>
        </div>
    </div>
  )
}

export default FeaturesSection