from typing import Dict, List, Any
import logging
from fuzzywuzzy import fuzz, process
import re

logger = logging.getLogger(__name__)

class JobMatcher:
    def __init__(self):
        """Initialize job matcher with skill categories and weights"""
        self.skill_weights = {
            'technical': 0.4,
            'soft': 0.2,
            'domain': 0.3,
            'tools': 0.1
        }
        
        self.experience_weight = 0.3
        self.education_weight = 0.2
        self.skills_weight = 0.5
        
    def calculate_match_score(self, candidate_data: Dict, job_requirements: Dict, job_description: str = "") -> Dict[str, Any]:
        """
        Calculate overall match score between candidate and job requirements
        
        Args:
            candidate_data: Candidate's skills, experience, education
            job_requirements: Job requirements from job posting
            job_description: Full job description text
            
        Returns:
            Dictionary with overall score and detailed breakdown
        """
        try:
            # Calculate individual component scores
            skills_score = self._calculate_skills_match(
                candidate_data.get('skills', []),
                job_requirements.get('skills', [])
            )
            
            experience_score = self._calculate_experience_match(
                candidate_data.get('experience', []),
                job_requirements.get('experience', {})
            )
            
            education_score = self._calculate_education_match(
                candidate_data.get('education', []),
                job_requirements.get('education', {})
            )
            
            # Calculate weighted overall score
            overall_score = (
                skills_score * self.skills_weight +
                experience_score * self.experience_weight +
                education_score * self.education_weight
            )
            
            # Generate recommendations
            recommendations = self._generate_recommendations(
                skills_score, experience_score, education_score, job_requirements
            )
            
            return {
                'overallScore': round(overall_score, 1),
                'breakdown': {
                    'skills': round(skills_score, 1),
                    'experience': round(experience_score, 1),
                    'education': round(education_score, 1)
                },
                'recommendations': recommendations
            }
            
        except Exception as e:
            logger.error(f"Match calculation error: {str(e)}")
            return {
                'overallScore': 0,
                'breakdown': {'skills': 0, 'experience': 0, 'education': 0},
                'recommendations': []
            }
    
    def _calculate_skills_match(self, candidate_skills: List, required_skills: List) -> float:
        """Calculate skills match score using fuzzy matching"""
        if not required_skills:
            return 100.0
            
        if not candidate_skills:
            return 0.0
        
        # Extract skill names from candidate skills (handle both string and dict formats)
        candidate_skill_names = []
        for skill in candidate_skills:
            if isinstance(skill, dict):
                candidate_skill_names.append(skill.get('name', '').lower())
            else:
                candidate_skill_names.append(str(skill).lower())
        
        # Calculate matches for each required skill
        total_weight = 0
        matched_weight = 0
        
        for req_skill in required_skills:
            skill_name = req_skill.get('name', '').lower() if isinstance(req_skill, dict) else str(req_skill).lower()
            skill_weight = req_skill.get('weight', 5) if isinstance(req_skill, dict) else 5
            is_required = req_skill.get('isRequired', True) if isinstance(req_skill, dict) else True
            
            total_weight += skill_weight
            
            # Find best match using fuzzy matching
            best_match = process.extractOne(skill_name, candidate_skill_names)
            
            if best_match and best_match[1] >= 80:  # 80% similarity threshold
                matched_weight += skill_weight
            elif best_match and best_match[1] >= 60:  # Partial match
                matched_weight += skill_weight * 0.5
        
        return (matched_weight / total_weight * 100) if total_weight > 0 else 0.0
    
    def _calculate_experience_match(self, candidate_experience: List, required_experience: Dict) -> float:
        """Calculate experience match score"""
        if not required_experience:
            return 100.0
        
        min_years = required_experience.get('minimumYears', 0)
        max_years = required_experience.get('maximumYears')
        
        # Calculate total years of experience
        total_years = 0
        for exp in candidate_experience:
            if isinstance(exp, dict):
                # Try to extract years from experience data
                start_year = self._extract_year(exp.get('startDate', ''))
                end_year = self._extract_year(exp.get('endDate', '')) if not exp.get('isCurrentJob', False) else 2024
                
                if start_year and end_year:
                    total_years += max(0, end_year - start_year)
        
        # Score based on experience requirements
        if total_years < min_years:
            return max(0, (total_years / min_years) * 100) if min_years > 0 else 50
        elif max_years and total_years > max_years:
            return max(50, 100 - ((total_years - max_years) * 5))  # Slight penalty for overqualification
        else:
            return 100.0
    
    def _calculate_education_match(self, candidate_education: List, required_education: Dict) -> float:
        """Calculate education match score"""
        if not required_education:
            return 100.0
        
        min_level = required_education.get('minimumLevel', '').lower()
        fields_of_study = [field.lower() for field in required_education.get('fieldOfStudy', [])]
        is_required = required_education.get('isRequired', True)
        
        if not is_required:
            return 100.0  # Education not required
        
        if not candidate_education:
            return 0.0 if is_required else 100.0
        
        # Education level hierarchy
        education_levels = {
            'high school': 1,
            'associate': 2,
            'bachelor': 3,
            'master': 4,
            'phd': 5,
            'doctorate': 5
        }
        
        required_level_score = education_levels.get(min_level, 0)
        
        # Find highest education level of candidate
        candidate_max_level = 0
        field_match = False
        
        for edu in candidate_education:
            if isinstance(edu, dict):
                degree = edu.get('degree', '').lower()
                field = edu.get('fieldOfStudy', '').lower()
                
                # Check education level
                for level_name, level_score in education_levels.items():
                    if level_name in degree:
                        candidate_max_level = max(candidate_max_level, level_score)
                        break
                
                # Check field of study match
                if fields_of_study:
                    for required_field in fields_of_study:
                        if fuzz.partial_ratio(required_field, field) >= 70:
                            field_match = True
                            break
        
        # Calculate score
        level_score = min(100, (candidate_max_level / required_level_score) * 100) if required_level_score > 0 else 100
        
        if fields_of_study and not field_match:
            level_score *= 0.7  # Reduce score if field doesn't match
        
        return level_score
    
    def _extract_year(self, date_string: str) -> int:
        """Extract year from date string"""
        if not date_string:
            return None
        
        # Try to extract 4-digit year
        year_match = re.search(r'\b(19|20)\d{2}\b', str(date_string))
        if year_match:
            return int(year_match.group())
        
        return None
    
    def _generate_recommendations(self, skills_score: float, experience_score: float, education_score: float, job_requirements: Dict) -> List[str]:
        """Generate improvement recommendations based on scores"""
        recommendations = []
        
        if skills_score < 70:
            recommendations.append("Consider acquiring more of the required technical skills")
        
        if experience_score < 70:
            min_years = job_requirements.get('experience', {}).get('minimumYears', 0)
            if min_years > 0:
                recommendations.append(f"Gain more relevant work experience (minimum {min_years} years required)")
        
        if education_score < 70:
            min_level = job_requirements.get('education', {}).get('minimumLevel', '')
            if min_level:
                recommendations.append(f"Consider pursuing {min_level} level education")
        
        return recommendations
