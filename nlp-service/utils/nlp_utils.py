import re
import logging
from typing import List, Dict, Any
from collections import Counter
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

logger = logging.getLogger(__name__)

class NLPUtils:
    def __init__(self):
        """Initialize NLP utilities"""
        self.skill_categories = {
            'programming': ['python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'php', 'ruby', 'go', 'rust'],
            'web_frontend': ['react', 'angular', 'vue', 'html', 'css', 'sass', 'bootstrap', 'tailwind'],
            'web_backend': ['node.js', 'express', 'django', 'flask', 'spring', 'laravel', 'rails'],
            'databases': ['mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'oracle', 'sql server'],
            'cloud': ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins', 'ci/cd'],
            'data_science': ['pandas', 'numpy', 'scikit-learn', 'tensorflow', 'pytorch', 'matplotlib', 'jupyter'],
            'mobile': ['ios', 'android', 'react native', 'flutter', 'swift', 'kotlin', 'xamarin'],
            'tools': ['git', 'jira', 'confluence', 'slack', 'figma', 'photoshop', 'illustrator']
        }
        
        # Initialize TF-IDF vectorizer for text similarity
        self.tfidf = TfidfVectorizer(
            max_features=1000,
            stop_words='english',
            ngram_range=(1, 2)
        )
    
    def calculate_resume_score(self, extracted_data: Dict[str, Any]) -> float:
        """
        Calculate overall resume score based on extracted information
        
        Args:
            extracted_data: Dictionary containing extracted resume information
            
        Returns:
            Score between 0 and 100
        """
        try:
            scores = {}
            weights = {
                'contact_completeness': 0.1,
                'skills_quality': 0.3,
                'experience_quality': 0.3,
                'education_quality': 0.2,
                'certifications': 0.1
            }
            
            # Contact information completeness
            scores['contact_completeness'] = self._score_contact_info(extracted_data.get('contactInfo', {}))
            
            # Skills assessment
            scores['skills_quality'] = self._score_skills(extracted_data.get('skills', []))
            
            # Experience assessment
            scores['experience_quality'] = self._score_experience(extracted_data.get('experience', []))
            
            # Education assessment
            scores['education_quality'] = self._score_education(extracted_data.get('education', []))
            
            # Certifications
            scores['certifications'] = self._score_certifications(extracted_data.get('certifications', []))
            
            # Calculate weighted average
            total_score = sum(scores[key] * weights[key] for key in scores)
            
            return min(100, max(0, total_score))
            
        except Exception as e:
            logger.error(f"Resume scoring error: {str(e)}")
            return 0.0
    
    def extract_keywords(self, text: str, max_keywords: int = 20) -> List[Dict[str, Any]]:
        """
        Extract important keywords from text using TF-IDF
        
        Args:
            text: Input text
            max_keywords: Maximum number of keywords to return
            
        Returns:
            List of keywords with scores
        """
        try:
            # Preprocess text
            cleaned_text = self._preprocess_for_keywords(text)
            
            if not cleaned_text:
                return []
            
            # Fit TF-IDF
            tfidf_matrix = self.tfidf.fit_transform([cleaned_text])
            feature_names = self.tfidf.get_feature_names_out()
            scores = tfidf_matrix.toarray()[0]
            
            # Get top keywords
            keyword_scores = list(zip(feature_names, scores))
            keyword_scores.sort(key=lambda x: x[1], reverse=True)
            
            keywords = []
            for keyword, score in keyword_scores[:max_keywords]:
                if score > 0:
                    keywords.append({
                        'keyword': keyword,
                        'score': round(score, 4),
                        'category': self._categorize_keyword(keyword)
                    })
            
            return keywords
            
        except Exception as e:
            logger.error(f"Keyword extraction error: {str(e)}")
            return []
    
    def analyze_skills(self, skills: List[str]) -> Dict[str, Any]:
        """
        Analyze and standardize skills list
        
        Args:
            skills: List of skill names
            
        Returns:
            Dictionary with standardized skills and analysis
        """
        try:
            standardized_skills = []
            skill_categories = {}
            
            for skill in skills:
                if not skill or len(skill.strip()) < 2:
                    continue
                
                skill_cleaned = skill.strip().lower()
                
                # Standardize skill name
                standardized_name = self._standardize_skill_name(skill_cleaned)
                
                # Categorize skill
                category = self._categorize_skill(skill_cleaned)
                
                if category not in skill_categories:
                    skill_categories[category] = []
                
                skill_info = {
                    'original': skill.strip(),
                    'standardized': standardized_name,
                    'category': category
                }
                
                standardized_skills.append(skill_info)
                skill_categories[category].append(standardized_name)
            
            # Generate suggestions for missing skill categories
            suggestions = self._generate_skill_suggestions(skill_categories)
            
            return {
                'standardized': standardized_skills,
                'categories': skill_categories,
                'suggestions': suggestions
            }
            
        except Exception as e:
            logger.error(f"Skills analysis error: {str(e)}")
            return {
                'standardized': [],
                'categories': {},
                'suggestions': []
            }
    
    def calculate_text_similarity(self, text1: str, text2: str) -> float:
        """
        Calculate similarity between two texts using cosine similarity
        
        Args:
            text1: First text
            text2: Second text
            
        Returns:
            Similarity score between 0 and 1
        """
        try:
            if not text1 or not text2:
                return 0.0
            
            # Preprocess texts
            text1_clean = self._preprocess_for_keywords(text1)
            text2_clean = self._preprocess_for_keywords(text2)
            
            if not text1_clean or not text2_clean:
                return 0.0
            
            # Calculate TF-IDF vectors
            tfidf_matrix = self.tfidf.fit_transform([text1_clean, text2_clean])
            
            # Calculate cosine similarity
            similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
            
            return max(0.0, min(1.0, similarity))
            
        except Exception as e:
            logger.error(f"Text similarity calculation error: {str(e)}")
            return 0.0
    
    def _score_contact_info(self, contact_info: Dict[str, Any]) -> float:
        """Score contact information completeness"""
        required_fields = ['email', 'phone']
        optional_fields = ['location', 'linkedin']
        
        score = 0
        for field in required_fields:
            if contact_info.get(field):
                score += 40  # 80 points for required fields
        
        for field in optional_fields:
            if contact_info.get(field):
                score += 10  # 20 points for optional fields
        
        return min(100, score)
    
    def _score_skills(self, skills: List[str]) -> float:
        """Score skills based on quantity and diversity"""
        if not skills:
            return 0
        
        skill_count = len(skills)
        
        # Base score based on number of skills
        if skill_count >= 10:
            quantity_score = 100
        elif skill_count >= 5:
            quantity_score = 80
        elif skill_count >= 3:
            quantity_score = 60
        else:
            quantity_score = skill_count * 20
        
        # Diversity bonus
        categories_covered = set()
        for skill in skills:
            category = self._categorize_skill(skill.lower())
            categories_covered.add(category)
        
        diversity_bonus = min(20, len(categories_covered) * 5)
        
        return min(100, quantity_score + diversity_bonus)
    
    def _score_experience(self, experience: List[Dict[str, Any]]) -> float:
        """Score work experience"""
        if not experience:
            return 0
        
        exp_count = len(experience)
        
        # Base score
        if exp_count >= 3:
            base_score = 100
        elif exp_count == 2:
            base_score = 80
        else:
            base_score = 50
        
        # Quality bonus for detailed descriptions
        quality_bonus = 0
        for exp in experience:
            description = exp.get('description', '')
            if len(description) > 100:
                quality_bonus += 10
        
        return min(100, base_score + quality_bonus)
    
    def _score_education(self, education: List[Dict[str, Any]]) -> float:
        """Score education information"""
        if not education:
            return 50  # Some score even without formal education
        
        education_levels = {
            'phd': 100, 'doctorate': 100,
            'master': 90, 'masters': 90,
            'bachelor': 80, 'bachelors': 80,
            'associate': 70,
            'diploma': 60, 'certificate': 50
        }
        
        max_score = 0
        for edu in education:
            degree = edu.get('degree', '').lower()
            for level, score in education_levels.items():
                if level in degree:
                    max_score = max(max_score, score)
                    break
        
        return max_score if max_score > 0 else 50
    
    def _score_certifications(self, certifications: List[str]) -> float:
        """Score certifications"""
        if not certifications:
            return 0
        
        cert_count = len(certifications)
        
        if cert_count >= 3:
            return 100
        elif cert_count == 2:
            return 80
        else:
            return 60
    
    def _preprocess_for_keywords(self, text: str) -> str:
        """Preprocess text for keyword extraction"""
        if not text:
            return ""
        
        # Convert to lowercase
        text = text.lower()
        
        # Remove special characters but keep alphanumeric and spaces
        text = re.sub(r'[^a-zA-Z0-9\s]', ' ', text)
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text
    
    def _categorize_keyword(self, keyword: str) -> str:
        """Categorize a keyword into skill category"""
        return self._categorize_skill(keyword)
    
    def _categorize_skill(self, skill: str) -> str:
        """Categorize a skill into predefined categories"""
        skill_lower = skill.lower()
        
        for category, skills in self.skill_categories.items():
            for category_skill in skills:
                if category_skill.lower() in skill_lower or skill_lower in category_skill.lower():
                    return category
        
        # Default category
        return 'other'
    
    def _standardize_skill_name(self, skill: str) -> str:
        """Standardize skill name"""
        # Common standardizations
        standardizations = {
            'js': 'JavaScript',
            'ts': 'TypeScript',
            'css3': 'CSS',
            'html5': 'HTML',
            'reactjs': 'React',
            'nodejs': 'Node.js',
            'mysql': 'MySQL',
            'postgresql': 'PostgreSQL',
            'aws': 'Amazon Web Services',
            'gcp': 'Google Cloud Platform'
        }
        
        return standardizations.get(skill.lower(), skill.title())
    
    def _generate_skill_suggestions(self, current_categories: Dict[str, List[str]]) -> List[str]:
        """Generate suggestions for missing skill categories"""
        suggestions = []
        
        # Check for missing fundamental categories
        if 'programming' not in current_categories:
            suggestions.append("Consider adding programming languages like Python, Java, or JavaScript")
        
        if 'databases' not in current_categories and 'programming' in current_categories:
            suggestions.append("Database skills like SQL, MySQL, or MongoDB would complement your programming skills")
        
        if 'cloud' not in current_categories and len(current_categories) > 2:
            suggestions.append("Cloud platforms like AWS, Azure, or GCP are highly valued in the market")
        
        return suggestions
