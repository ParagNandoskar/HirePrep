import re
import spacy
from typing import List, Dict, Any, Optional
import logging
from utils.text_processor import TextProcessor

logger = logging.getLogger(__name__)

class EntityExtractor:
    def __init__(self, nlp_model):
        """Initialize entity extractor with spaCy model"""
        self.nlp = nlp_model
        self.text_processor = TextProcessor()
        
        # Common skill keywords and patterns
        self.technical_skills = {
            'programming': ['python', 'java', 'javascript', 'c++', 'c#', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin'],
            'web': ['html', 'css', 'react', 'angular', 'vue', 'node', 'express', 'django', 'flask', 'spring'],
            'database': ['sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'oracle'],
            'cloud': ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins'],
            'data': ['pandas', 'numpy', 'sklearn', 'tensorflow', 'pytorch', 'matplotlib', 'tableau'],
            'tools': ['git', 'jira', 'confluence', 'slack', 'trello', 'figma', 'photoshop']
        }
        
        # Education keywords
        self.education_keywords = {
            'degrees': ['bachelor', 'master', 'phd', 'doctorate', 'associate', 'diploma', 'certificate'],
            'fields': ['computer science', 'engineering', 'business', 'marketing', 'finance', 'psychology'],
            'institutions': ['university', 'college', 'institute', 'school']
        }
        
        # Certification patterns
        self.certification_patterns = [
            r'certified\s+[\w\s]+(?:professional|specialist|expert|associate)',
            r'[\w\s]+\s+certification',
            r'[\w\s]+\s+certified',
            r'aws\s+[\w\s]+',
            r'microsoft\s+[\w\s]+',
            r'google\s+[\w\s]+',
            r'cisco\s+[\w\s]+',
            r'oracle\s+[\w\s]+',
        ]
    
    def extract_contact_info(self, text: str) -> Dict[str, Any]:
        """Extract contact information from resume text"""
        contact_info = {}
        
        # Extract emails
        emails = self.text_processor.extract_emails(text)
        if emails:
            contact_info['email'] = emails[0]  # Take first email
        
        # Extract phone numbers
        phones = self.text_processor.extract_phone_numbers(text)
        if phones:
            contact_info['phone'] = phones[0]  # Take first phone
        
        # Extract location (basic pattern matching)
        location = self._extract_location(text)
        if location:
            contact_info['location'] = location
        
        # Extract LinkedIn profile
        linkedin = self._extract_linkedin(text)
        if linkedin:
            contact_info['linkedin'] = linkedin
        
        return contact_info
    
    def extract_skills(self, text: str) -> List[str]:
        """Extract technical and soft skills from text with word boundary checking"""
        skills = set()
        text_lower = text.lower()
        
        # Extract technical skills with word boundaries to avoid partial matches
        for category, skill_list in self.technical_skills.items():
            for skill in skill_list:
                # Use word boundaries to ensure exact matches
                pattern = r'\b' + re.escape(skill) + r'\b'
                if re.search(pattern, text_lower):
                    skills.add(skill.title())
        
        # Extract skills from dedicated skills section first (most reliable)
        skill_section = self._extract_skills_section(text)
        if skill_section:
            section_skills = self._parse_skills_section(skill_section)
            skills.update(section_skills)
        
        # Use spaCy NER to find additional skills (but filter more carefully)
        if self.nlp:
            doc = self.nlp(text)
            for ent in doc.ents:
                if ent.label_ in ['PRODUCT'] and len(ent.text) > 2:
                    # Only include if it's clearly a technical term and not a partial word
                    if self._is_technical_term(ent.text) and self._is_standalone_skill(ent.text, text):
                        skills.add(ent.text)
        
        return list(skills)
    
    def extract_education(self, text: str) -> List[Dict[str, Any]]:
        """Extract education information with better pattern matching"""
        education = []
        
        # Find education section
        education_section = self._extract_education_section(text)
        if not education_section:
            education_section = text  # Fall back to full text
        
        # Updated degree patterns for better matching
        degree_patterns = [
            r'(B\.?Tech\.?|Bachelor\s+of\s+Technology)\s+(?:in\s+)?([\w\s&]+?)(?:\s+CGPA|\s+GPA|\s+\d{4}|\n)',
            r'(B\.?E\.?|Bachelor\s+of\s+Engineering)\s+(?:in\s+)?([\w\s&]+?)(?:\s+CGPA|\s+GPA|\s+\d{4}|\n)',
            r'(M\.?Tech\.?|Master\s+of\s+Technology)\s+(?:in\s+)?([\w\s&]+?)(?:\s+CGPA|\s+GPA|\s+\d{4}|\n)',
            r'(Bachelor|Master|PhD|Doctorate)\s+(?:of\s+)?(?:Science\s+)?(?:Arts\s+)?(?:in\s+)?([\w\s&]+?)(?:\s+CGPA|\s+GPA|\s+\d{4}|\n)',
            r'(B\.?S\.?|M\.?S\.?|Ph\.?D\.?|M\.?A\.?|B\.?A\.?)\s+(?:in\s+)?([\w\s&]+?)(?:\s+CGPA|\s+GPA|\s+\d{4}|\n)',
        ]
        
        for pattern in degree_patterns:
            matches = re.finditer(pattern, education_section, re.IGNORECASE | re.MULTILINE)
            for match in matches:
                degree = match.group(1).strip()
                field = match.group(2).strip() if len(match.groups()) > 1 and match.group(2) else ""
                
                # Clean up field of study
                field = re.sub(r'\s+', ' ', field).strip()
                
                # Try to find institution name nearby
                institution = self._find_nearby_institution(education_section, match.start(), match.end())
                
                # Try to find graduation year
                year = self._find_nearby_year(education_section, match.start(), match.end())
                
                education.append({
                    'degree': degree,
                    'fieldOfStudy': field,
                    'institution': institution,
                    'year': year
                })
        
        return education
    
    def extract_experience(self, text: str) -> List[Dict[str, Any]]:
        """Extract work experience information"""
        experience = []
        
        # Find experience section
        experience_section = self._extract_experience_section(text)
        if not experience_section:
            experience_section = text
        
        # Split into potential job entries
        job_entries = self._split_experience_entries(experience_section)
        
        for entry in job_entries:
            job_info = self._parse_job_entry(entry)
            if job_info:
                experience.append(job_info)
        
        return experience
    
    def extract_certifications(self, text: str) -> List[str]:
        """Extract certifications from text"""
        certifications = set()
        
        for pattern in self.certification_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                cert = match.group(0).strip()
                if len(cert) > 5:  # Filter out short matches
                    certifications.add(cert)
        
        return list(certifications)
    
    def extract_summary(self, text: str) -> str:
        """Extract professional summary or objective"""
        summary_section = self._extract_summary_section(text)
        if summary_section:
            # Clean and return first paragraph or first few sentences
            sentences = summary_section.split('.')[:3]  # First 3 sentences
            return '. '.join(sentences).strip() + '.' if sentences else ""
        
        return ""
    
    def extract_named_entities(self, text: str) -> Dict[str, List[str]]:
        """Extract named entities using spaCy NER"""
        if not self.nlp:
            return {}
        
        doc = self.nlp(text)
        entities = {}
        
        for ent in doc.ents:
            if ent.label_ not in entities:
                entities[ent.label_] = []
            
            if ent.text not in entities[ent.label_]:
                entities[ent.label_].append(ent.text)
        
        return entities
    
    def _extract_location(self, text: str) -> str:
        """Extract location information"""
        # Common location patterns
        location_patterns = [
            r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2})\s*\d{5}',  # City, ST 12345
            r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2})',           # City, ST
            r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z][a-z]+)',        # City, State
        ]
        
        for pattern in location_patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(0)
        
        return ""
    
    def _extract_linkedin(self, text: str) -> str:
        """Extract LinkedIn profile URL"""
        linkedin_pattern = r'(?:https?://)?(?:www\.)?linkedin\.com/in/[\w\-]+'
        match = re.search(linkedin_pattern, text, re.IGNORECASE)
        return match.group(0) if match else ""
    
    def _is_technical_term(self, term: str) -> bool:
        """Check if a term is likely a technical skill"""
        technical_indicators = ['js', 'api', 'sdk', 'framework', 'library', 'database', 'server']
        term_lower = term.lower()
        
        # Check if it's in our skill lists
        for category, skills in self.technical_skills.items():
            if term_lower in skills:
                return True
        
        # Check for technical indicators
        for indicator in technical_indicators:
            if indicator in term_lower:
                return True
        
        return False
    
    def _is_standalone_skill(self, skill: str, text: str) -> bool:
        """Check if a skill mention is standalone and not part of another word"""
        # Look for the skill with word boundaries
        pattern = r'\b' + re.escape(skill.lower()) + r'\b'
        return bool(re.search(pattern, text.lower()))
    
    def _extract_skills_section(self, text: str) -> str:
        """Extract the skills section from resume"""
        return self.text_processor._extract_section_content(
            text, text.lower(), self.text_processor.section_headers['skills']
        )
    
    def _extract_education_section(self, text: str) -> str:
        """Extract the education section from resume"""
        return self.text_processor._extract_section_content(
            text, text.lower(), self.text_processor.section_headers['education']
        )
    
    def _extract_experience_section(self, text: str) -> str:
        """Extract the experience section from resume"""
        return self.text_processor._extract_section_content(
            text, text.lower(), self.text_processor.section_headers['experience']
        )
    
    def _extract_summary_section(self, text: str) -> str:
        """Extract the summary section from resume"""
        return self.text_processor._extract_section_content(
            text, text.lower(), self.text_processor.section_headers['summary']
        )
    
    def _parse_skills_section(self, skills_text: str) -> List[str]:
        """Parse skills from skills section text with better formatting handling"""
        skills = set()
        
        # Handle different skill section formats
        # Format 1: "Frontend: React, HTML, CSS"
        category_pattern = r'([A-Za-z\s]+):\s*([^\n\r]+)'
        category_matches = re.findall(category_pattern, skills_text)
        
        for category, skill_list in category_matches:
            # Split skills by commas and clean them
            skill_items = re.split(r'[,;\n\t\|]', skill_list)
            for item in skill_items:
                item = item.strip()
                if len(item) > 1 and len(item) < 30:  # Reasonable skill name length
                    # Remove any trailing punctuation or formatting
                    item = re.sub(r'[^\w\s\.\+\#-]', '', item).strip()
                    if item:
                        skills.add(item)
        
        # If no categorized skills found, try general parsing
        if not skills:
            # Split by common delimiters
            skill_items = re.split(r'[,;\n\t\|]', skills_text)
            
            for item in skill_items:
                item = item.strip()
                # Clean up the item
                item = re.sub(r'^[-•\*\s]+', '', item)  # Remove bullet points
                item = re.sub(r'[^\w\s\.\+\#-]', '', item).strip()  # Remove special chars except common ones in tech
                
                if len(item) > 1 and len(item) < 30:  # Reasonable skill name length
                    skills.add(item)
        
        return list(skills)
    
    def _find_nearby_institution(self, text: str, start: int, end: int) -> str:
        """Find institution name near degree mention with better pattern matching"""
        # Look in the surrounding text
        window = 300  # characters
        start_pos = max(0, start - window)
        end_pos = min(len(text), end + window)
        context = text[start_pos:end_pos]
        
        # Look for university/college keywords with more specific patterns
        institution_patterns = [
            r"([A-Z][a-zA-Z\s']+(?:University|College|Institute|School|Academy)[^,\n]*)",
            r"([A-Z][a-zA-Z\s'&-]+(?:University|College|Institute|School|Academy))",
            r"([A-Z][a-zA-Z\s']+(?:of\s+)?(?:Engineering|Technology|Science|Arts|Business|Medicine)[^,\n]*)",
        ]
        
        for pattern in institution_patterns:
            match = re.search(pattern, context)
            if match:
                institution = match.group(1).strip()
                # Clean up the institution name
                institution = re.sub(r'\s+', ' ', institution)
                institution = re.sub(r'^\s*[,\-\s]+|[,\-\s]+$', '', institution)
                if len(institution) > 5:  # Must be reasonable length
                    return institution
        
        return ""
    
    def _find_nearby_year(self, text: str, start: int, end: int) -> str:
        """Find graduation year near degree mention"""
        window = 100
        start_pos = max(0, start - window)
        end_pos = min(len(text), end + window)
        context = text[start_pos:end_pos]
        
        # Look for 4-digit years
        year_pattern = r'\b(19|20)\d{2}\b'
        matches = re.findall(year_pattern, context)
        
        return matches[-1] if matches else ""  # Return last year found
    
    def _split_experience_entries(self, experience_text: str) -> List[str]:
        """Split experience section into individual job entries"""
        # Split by patterns that indicate new job entries
        entries = re.split(r'\n(?=[A-Z][a-z\s]+(Engineer|Manager|Developer|Analyst|Specialist|Director|Lead))', experience_text)
        return [entry.strip() for entry in entries if len(entry.strip()) > 50]
    
    def _parse_job_entry(self, entry: str) -> Optional[Dict[str, Any]]:
        """Parse individual job entry"""
        lines = entry.split('\n')
        if len(lines) < 2:
            return None
        
        # First line usually contains position and company
        first_line = lines[0].strip()
        position_company_match = re.match(r'(.+?)\s+(?:at\s+)?(.+)', first_line)
        
        if position_company_match:
            position = position_company_match.group(1).strip()
            company = position_company_match.group(2).strip()
        else:
            position = first_line
            company = ""
        
        # Look for duration in second line or first line
        duration = self._extract_duration(entry)
        
        # Get description (remaining lines)
        description = '\n'.join(lines[1:]).strip()
        
        return {
            'position': position,
            'company': company,
            'duration': duration,
            'description': description[:500]  # Limit description length
        }
    
    def _extract_duration(self, text: str) -> str:
        """Extract job duration from text"""
        duration_patterns = [
            r'(\d{4})\s*[-–]\s*(\d{4})',  # 2020 - 2023
            r'(\d{4})\s*[-–]\s*(present|current)',  # 2020 - Present
            r'([A-Z][a-z]+\s+\d{4})\s*[-–]\s*([A-Z][a-z]+\s+\d{4})',  # Jan 2020 - Dec 2023
            r'([A-Z][a-z]+\s+\d{4})\s*[-–]\s*(present|current)',  # Jan 2020 - Present
        ]
        
        for pattern in duration_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(0)
        
        return ""
