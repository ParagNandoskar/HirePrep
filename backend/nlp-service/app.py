from flask import Flask, request, jsonify
import os
import logging
from dotenv import load_dotenv
from services.resume_parser import ResumeParser
from services.job_matcher import JobMatcher
from utils.nlp_utils import NLPUtils

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Initialize services
resume_parser = ResumeParser()
job_matcher = JobMatcher()
nlp_utils = NLPUtils()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'OK',
        'service': 'HirePrep NLP Service',
        'version': '1.0.0'
    })

@app.route('/parse-resume', methods=['POST'])
def parse_resume():
    """
    Parse resume and extract structured information
    Expected payload: {
        "resumeUrl": "s3_url_to_resume",
        "candidateId": "candidate_id",
        "forceReprocess": false
    }
    """
    try:
        data = request.get_json()
        
        if not data or not data.get('resumeUrl'):
            return jsonify({
                'success': False,
                'error': 'Resume URL is required'
            }), 400

        resume_url = data['resumeUrl']
        candidate_id = data.get('candidateId')
        force_reprocess = data.get('forceReprocess', False)

        logger.info(f"Processing resume for candidate {candidate_id}: {resume_url}")

        # Parse resume
        result = resume_parser.parse_resume(resume_url)
        
        if not result['success']:
            return jsonify(result), 500

        # Calculate NLP score
        score = nlp_utils.calculate_resume_score(result['extractedData'])
        
        response = {
            'success': True,
            'extractedData': result['extractedData'],
            'score': score,
            'candidateId': candidate_id,
            'processingTime': result.get('processingTime', 0)
        }

        logger.info(f"Successfully processed resume for candidate {candidate_id}, score: {score}")
        return jsonify(response)

    except Exception as e:
        logger.error(f"Resume parsing error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Resume parsing failed: {str(e)}'
        }), 500

@app.route('/calculate-match', methods=['POST'])
def calculate_match():
    """
    Calculate match score between candidate and job requirements
    Expected payload: {
        "candidateData": {
            "skills": [...],
            "experience": [...],
            "education": [...],
            "resume": {...}
        },
        "jobRequirements": {...},
        "jobDescription": "..."
    }
    """
    try:
        data = request.get_json()
        
        if not data or not data.get('candidateData') or not data.get('jobRequirements'):
            return jsonify({
                'success': False,
                'error': 'Candidate data and job requirements are required'
            }), 400

        candidate_data = data['candidateData']
        job_requirements = data['jobRequirements']
        job_description = data.get('jobDescription', '')

        logger.info("Calculating match score for candidate and job")

        # Calculate match score
        match_result = job_matcher.calculate_match_score(
            candidate_data, 
            job_requirements, 
            job_description
        )

        response = {
            'success': True,
            'matchScore': match_result['overallScore'],
            'breakdown': match_result['breakdown'],
            'recommendations': match_result.get('recommendations', [])
        }

        logger.info(f"Match score calculated: {match_result['overallScore']}")
        return jsonify(response)

    except Exception as e:
        logger.error(f"Match calculation error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Match calculation failed: {str(e)}'
        }), 500

@app.route('/extract-keywords', methods=['POST'])
def extract_keywords():
    """
    Extract keywords from job description
    Expected payload: {
        "text": "job description text",
        "maxKeywords": 20
    }
    """
    try:
        data = request.get_json()
        
        if not data or not data.get('text'):
            return jsonify({
                'success': False,
                'error': 'Text is required'
            }), 400

        text = data['text']
        max_keywords = data.get('maxKeywords', 20)

        logger.info("Extracting keywords from text")

        # Extract keywords
        keywords = nlp_utils.extract_keywords(text, max_keywords)

        response = {
            'success': True,
            'keywords': keywords,
            'count': len(keywords)
        }

        return jsonify(response)

    except Exception as e:
        logger.error(f"Keyword extraction error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Keyword extraction failed: {str(e)}'
        }), 500

@app.route('/analyze-skills', methods=['POST'])
def analyze_skills():
    """
    Analyze and standardize skills list
    Expected payload: {
        "skills": ["python", "machine learning", "react js", ...]
    }
    """
    try:
        data = request.get_json()
        
        if not data or not data.get('skills'):
            return jsonify({
                'success': False,
                'error': 'Skills list is required'
            }), 400

        skills = data['skills']

        logger.info(f"Analyzing {len(skills)} skills")

        # Analyze and standardize skills
        analyzed_skills = nlp_utils.analyze_skills(skills)

        response = {
            'success': True,
            'standardizedSkills': analyzed_skills['standardized'],
            'categories': analyzed_skills['categories'],
            'suggestions': analyzed_skills.get('suggestions', [])
        }

        return jsonify(response)

    except Exception as e:
        logger.error(f"Skills analysis error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Skills analysis failed: {str(e)}'
        }), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Endpoint not found'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    debug = os.getenv('FLASK_ENV') == 'development'
    
    print(f"Starting NLP service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
