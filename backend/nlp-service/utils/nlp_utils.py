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
            # --- IT / Technical Domains ---
            'programming': [
                'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'php', 'ruby', 'go', 'rust', 'perl', 'scala',
                'r', 'objective-c', 'matlab', 'kotlin', 'swift', 'dart', 'shell scripting', 'powershell'
            ],
            'web_frontend': [
                'react', 'angular', 'vue', 'html', 'css', 'sass', 'bootstrap', 'tailwind', 'jquery', 'next.js', 'nuxt.js',
                'gatsby', 'svelte', 'webpack', 'vite', 'responsive design'
            ],
            'web_backend': [
                'node.js', 'express', 'django', 'flask', 'spring', 'laravel', 'rails', 'fastapi', 'asp.net', 'koa.js',
                'nestjs', 'gin', 'fiber', 'rest api', 'graphql', 'microservices'
            ],
            'databases': [
                'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'oracle', 'sql server', 'sqlite', 'cassandra', 
                'dynamodb', 'neo4j', 'influxdb', 'couchbase', 'sql', 'nosql', 'database design'
            ],
            'cloud': [
                'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins', 'ci/cd', 'openstack', 'ansible',
                'chef', 'puppet', 'vagrant', 'helm', 'istio', 'prometheus', 'grafana', 'elk stack'
            ],
            'data_science': [
                'pandas', 'numpy', 'scikit-learn', 'tensorflow', 'pytorch', 'matplotlib', 'jupyter', 'seaborn', 'spark', 'hadoop',
                'tableau', 'power bi', 'plotly', 'keras', 'data mining', 'machine learning', 'deep learning', 'nlp',
                'computer vision', 'statistical analysis', 'data visualization'
            ],
            'mobile': [
                'ios', 'android', 'react native', 'flutter', 'swift', 'kotlin', 'xamarin', 'ionic', 'cordova',
                'mobile ui/ux', 'app store optimization'
            ],
            'tools': [
                'git', 'jira', 'confluence', 'slack', 'figma', 'photoshop', 'illustrator', 'notion', 'trello', 'microsoft office',
                'vs code', 'intellij', 'eclipse', 'postman', 'swagger', 'adobe creative suite'
            ],

            # --- Finance & Accounting ---
            'finance': [
                'accounting', 'financial analysis', 'budgeting', 'forecasting', 'auditing', 'taxation', 'cost accounting',
                'gaap', 'ifrs', 'tally', 'tally erp 9', 'sap', 'quickbooks', 'financial modeling', 'investment analysis', 
                'risk management', 'portfolio management', 'corporate finance', 'financial reporting', 'variance analysis',
                'cash flow analysis', 'financial planning', 'excel financial modeling', 'accounts receivable', 'accounts payable',
                'general ledger', 'trial balance', 'profit and loss', 'balance sheet', 'gst', 'income tax', 'tax preparation'
            ],
            'banking': [
                'retail banking', 'commercial banking', 'credit analysis', 'loan processing', 'anti-money laundering', 'kyc',
                'wealth management', 'financial compliance', 'banking operations', 'treasury management', 'trade finance',
                'mortgage processing', 'credit risk assessment', 'Basel III'
            ],

            # --- Healthcare & Life Sciences ---
            'healthcare': [
                'patient care', 'clinical research', 'phlebotomy', 'icu monitoring', 'triage', 'diagnostics',
                'medical billing', 'hipaa compliance', 'ehr', 'emr', 'pharmacology', 'pathology', 'surgery assistance',
                'medical coding', 'healthcare administration', 'telemedicine', 'clinical documentation'
            ],
            'nursing': [
                'bcls', 'acls', 'iv therapy', 'patient assessment', 'critical care', 'pediatric nursing', 'geriatric nursing',
                'wound care', 'medication administration', 'patient education', 'nursing documentation'
            ],
            'pharma_bio': [
                'drug safety', 'clinical trials', 'gmp', 'glp', 'biostatistics', 'toxicology', 'molecular biology',
                'genomics', 'bioinformatics', 'pharmacovigilance', 'regulatory affairs', 'drug development'
            ],

            # --- Legal & Compliance ---
            'legal': [
                'contract law', 'corporate law', 'intellectual property', 'litigation', 'arbitration', 'legal drafting',
                'compliance', 'mergers and acquisitions', 'employment law', 'tax law', 'international law',
                'legal research', 'case analysis', 'regulatory compliance', 'contract negotiation'
            ],
            'paralegal': [
                'legal research', 'case management', 'document review', 'e-discovery', 'court filings',
                'legal writing', 'deposition assistance', 'trial preparation'
            ],

            # --- Education & Training ---
            'education': [
                'curriculum design', 'lesson planning', 'classroom management', 'pedagogy', 'e-learning',
                'special education', 'edtech', 'assessment design', 'student counseling', 'educational technology',
                'instructional design', 'learning management systems', 'student evaluation'
            ],
            'research': [
                'academic writing', 'literature review', 'quantitative analysis', 'qualitative research', 'data analysis',
                'research methodology', 'statistical software', 'grant writing', 'peer review'
            ],

            # --- Business, Management & HR ---
            'management': [
                'project management', 'agile', 'scrum', 'kanban', 'six sigma', 'lean management', 'operations management',
                'strategic planning', 'business analysis', 'pmp', 'prince2', 'change management', 'process improvement',
                'team leadership', 'stakeholder management', 'risk management'
            ],
            'hr': [
                'recruitment', 'talent acquisition', 'employee relations', 'hr policies', 'payroll processing',
                'performance management', 'training and development', 'hr analytics', 'compensation and benefits',
                'onboarding', 'exit interviews', 'diversity and inclusion', 'employee engagement'
            ],
            'marketing': [
                'digital marketing', 'seo', 'sem', 'content marketing', 'social media marketing', 'email marketing',
                'market research', 'branding', 'google analytics', 'crm', 'ppc campaigns', 'marketing automation',
                'lead generation', 'conversion optimization', 'brand management', 'influencer marketing'
            ],
            'sales': [
                'business development', 'lead generation', 'salesforce', 'negotiation', 'account management',
                'customer relationship management', 'sales forecasting', 'territory management', 'pipeline management',
                'cold calling', 'client presentations', 'closing techniques'
            ],

            # --- Supply Chain & Manufacturing ---
            'supply_chain': [
                'inventory management', 'logistics', 'procurement', 'vendor management', 'supply chain optimization',
                'warehouse management', 'distribution', 'erp systems', 'sap mm', 'demand planning', 'supplier evaluation',
                'transportation management', 'customs clearance', 'import/export'
            ],
            'manufacturing': [
                'quality assurance', 'lean manufacturing', 'six sigma', 'kaizen', 'cad', 'cam', 'automation',
                'production planning', 'safety compliance', 'iso standards', 'quality control', 'process optimization',
                'equipment maintenance', 'factory operations'
            ],

            # --- Arts, Design & Media ---
            'design': [
                'graphic design', 'ui/ux', 'wireframing', 'adobe xd', 'sketch', 'coreldraw', 'indesign', 'user research',
                'prototyping', 'design thinking', 'brand identity', 'logo design', 'print design', 'web design'
            ],
            'media': [
                'video editing', 'final cut pro', 'premiere pro', 'after effects', 'content creation',
                'photography', 'storytelling', 'copywriting', 'social media content', 'podcast production',
                'animation', 'motion graphics', 'audio editing'
            ],

            # --- Soft Skills (cross-domain) ---
            'soft_skills': [
                'leadership', 'communication', 'problem solving', 'teamwork', 'adaptability', 'time management',
                'critical thinking', 'creativity', 'negotiation', 'conflict resolution', 'decision making',
                'emotional intelligence', 'public speaking', 'presentation skills', 'customer service',
                'analytical thinking', 'attention to detail', 'multitasking', 'stress management'
            ],

            # --- Additional Professional Areas ---
            'consulting': [
                'business consulting', 'management consulting', 'strategy consulting', 'process consulting',
                'change management', 'organizational development', 'business transformation'
            ],
            'real_estate': [
                'property management', 'real estate sales', 'property valuation', 'lease negotiations',
                'real estate law', 'market analysis', 'property development'
            ],
            'hospitality': [
                'hotel management', 'restaurant management', 'customer service', 'event planning',
                'food and beverage management', 'hospitality operations', 'guest relations'
            ]
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
            # Tech abbreviations
            'js': 'JavaScript',
            'ts': 'TypeScript',
            'css3': 'CSS',
            'html5': 'HTML',
            'reactjs': 'React',
            'nodejs': 'Node.js',
            'mysql': 'MySQL',
            'postgresql': 'PostgreSQL',
            'aws': 'Amazon Web Services',
            'gcp': 'Google Cloud Platform',
            'ui/ux': 'UI/UX Design',
            'ml': 'Machine Learning',
            'ai': 'Artificial Intelligence',
            'api': 'API Development',
            'sql': 'SQL',
            'nosql': 'NoSQL',
            'ci/cd': 'CI/CD',
            
            # Finance & Accounting
            'tally erp 9': 'Tally ERP 9',
            'tally erp': 'Tally ERP',
            'ms excel': 'Microsoft Excel',
            'excel': 'Microsoft Excel',
            'gst': 'GST (Goods and Services Tax)',
            'income tax': 'Income Tax',
            'gaap': 'GAAP (Generally Accepted Accounting Principles)',
            'ifrs': 'IFRS (International Financial Reporting Standards)',
            'financial analysis': 'Financial Analysis',
            'financial modeling': 'Financial Modeling',
            'p&l': 'Profit & Loss',
            'accounts payable': 'Accounts Payable',
            'accounts receivable': 'Accounts Receivable',
            
            # Business & Management
            'pmp': 'PMP (Project Management Professional)',
            'prince2': 'PRINCE2',
            'six sigma': 'Six Sigma',
            'lean': 'Lean Management',
            'agile': 'Agile Methodology',
            'scrum': 'Scrum Framework',
            'kanban': 'Kanban',
            'crm': 'Customer Relationship Management',
            'erp': 'Enterprise Resource Planning',
            'sap': 'SAP',
            
            # Healthcare
            'ehr': 'Electronic Health Records',
            'emr': 'Electronic Medical Records',
            'hipaa': 'HIPAA Compliance',
            'bcls': 'Basic Cardiac Life Support',
            'acls': 'Advanced Cardiac Life Support',
            'gmp': 'Good Manufacturing Practice',
            'glp': 'Good Laboratory Practice',
            
            # Legal
            'ip': 'Intellectual Property',
            'm&a': 'Mergers & Acquisitions',
            'kyc': 'Know Your Customer',
            'aml': 'Anti-Money Laundering',
            
            # Education
            'lms': 'Learning Management System',
            'edtech': 'Educational Technology',
            
            # Design & Media
            'adobe xd': 'Adobe XD',
            'photoshop': 'Adobe Photoshop',
            'illustrator': 'Adobe Illustrator',
            'indesign': 'Adobe InDesign',
            'premiere pro': 'Adobe Premiere Pro',
            'after effects': 'Adobe After Effects',
            'final cut pro': 'Final Cut Pro',
            
            # Soft Skills
            'communication': 'Communication Skills',
            'leadership': 'Leadership Skills',
            'teamwork': 'Teamwork',
            'problem solving': 'Problem Solving',
            'time management': 'Time Management',
            'project management': 'Project Management'
        }
        
        skill_lower = skill.lower().strip()
        return standardizations.get(skill_lower, skill.title())
    
    def _generate_skill_suggestions(self, current_categories: Dict[str, List[str]]) -> List[str]:
        """Generate suggestions for missing skill categories based on detected domain"""
        suggestions = []
        
        # Detect primary domain based on existing skills
        detected_domains = []
        if any(cat in current_categories for cat in ['programming', 'web_frontend', 'web_backend', 'databases', 'cloud']):
            detected_domains.append('tech')
        if any(cat in current_categories for cat in ['finance', 'banking']):
            detected_domains.append('finance')
        if any(cat in current_categories for cat in ['healthcare', 'nursing', 'pharma_bio']):
            detected_domains.append('healthcare')
        if any(cat in current_categories for cat in ['legal', 'paralegal']):
            detected_domains.append('legal')
        if any(cat in current_categories for cat in ['marketing', 'sales']):
            detected_domains.append('business')
        if any(cat in current_categories for cat in ['education', 'research']):
            detected_domains.append('education')
        
        # Tech domain suggestions
        if 'tech' in detected_domains:
            if 'programming' not in current_categories:
                suggestions.append("Consider adding programming languages like Python, Java, or JavaScript")
            
            if 'databases' not in current_categories and 'programming' in current_categories:
                suggestions.append("Database skills like SQL, MySQL, or MongoDB would complement your programming skills")
            
            if 'cloud' not in current_categories and len(current_categories) > 2:
                suggestions.append("Cloud platforms like AWS, Azure, or GCP are highly valued in the tech market")
                
            if 'tools' not in current_categories:
                suggestions.append("Development tools like Git, JIRA, or VS Code are essential for tech roles")
        
        # Finance domain suggestions
        elif 'finance' in detected_domains:
            if 'finance' in current_categories and 'tools' not in current_categories:
                suggestions.append("Consider adding tools like Excel, Tally, QuickBooks, or SAP for finance roles")
            
            if 'soft_skills' not in current_categories:
                suggestions.append("Analytical thinking and attention to detail are valued in finance")
                
            if 'banking' not in current_categories and 'finance' in current_categories:
                suggestions.append("Banking skills like credit analysis or compliance could expand opportunities")
        
        # Healthcare domain suggestions
        elif 'healthcare' in detected_domains:
            if 'healthcare' in current_categories and 'soft_skills' not in current_categories:
                suggestions.append("Patient care and communication skills are essential in healthcare")
                
            if 'healthcare' in current_categories and 'tools' not in current_categories:
                suggestions.append("Healthcare technology skills like EHR/EMR systems are increasingly important")
        
        # Business domain suggestions
        elif 'business' in detected_domains:
            if 'management' not in current_categories:
                suggestions.append("Project management skills like Agile, Scrum, or PMP certification are valuable")
                
            if 'tools' not in current_categories:
                suggestions.append("Business tools like CRM, Microsoft Office, or analytics platforms are important")
        
        # General suggestions for all domains
        if 'soft_skills' not in current_categories and len(current_categories) > 1:
            suggestions.append("Soft skills like leadership, communication, and teamwork are valuable across all industries")
        
        if not suggestions:
            suggestions.append("Your skill profile looks comprehensive! Consider adding certifications or advanced skills in your domain")
        
        return suggestions[:3]  # Limit to top 3 suggestions
