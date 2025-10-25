import re
import spacy
import sys
import os
from typing import List, Dict, Any, Optional
import logging

# Add project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

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
        """Extract education information with simple line-based splitting for messy tables."""
        education = []
        # Change: Use full text directly instead of section extraction
        education_section = text
        
        # Clean up the text block first: remove non-educational noise (links, contact info)
        clean_section = re.sub(r'(?:https?://|LinkedIn|Github|Portfolio)\s*', '', education_section, flags=re.IGNORECASE).strip()
        
        # Split by double newline or common separators to separate institution blocks
        edu_entries = re.split(r'\n\n|\n\s*-\s*|\n\s*•\s*', clean_section)
        
        # Simplified degree patterns focusing on common acronyms and keywords
        degree_patterns = [
            r'(B\.?Tech\.?|B\.?E\.?|Bachelor)',
            r'(M\.?Tech\.?|M\.?S\.?|Master)',
            r'(Ph\.?D\.?|Doctorate)',
            r'(12th|10th|SSC|HSC|Diploma)' # Capture the high school entries
        ]
        
        for entry in edu_entries:
            entry = entry.strip()
            if not entry:
                continue
                
            degree = ""
            field = ""
            
            # Check for degree type
            for pattern_str in degree_patterns:
                match = re.search(pattern_str, entry, re.IGNORECASE)
                if match:
                    degree = match.group(0).strip().replace('.', '')
                    break
                    
            # Simple extraction for institution (often the first strong capitalized phrase)
            institution_match = re.search(r'([A-Z][a-zA-Z\s,]+(?:College|University|Vidyamandir|Vidyalaya|Institute))', entry)
            institution = institution_match.group(1).strip() if institution_match else entry.split('\n')[0].strip()

            # Try to extract year (last 4-digit number)
            year = self._find_nearby_year(entry, 0, len(entry))

            if degree or institution:
                education.append({
                    'degree': degree,
                    'fieldOfStudy': field, # Field of study is too hard to reliably extract here
                    'institution': institution,
                    'year': year
                })
                
        return education
    
    def extract_experience(self, text: str) -> List[Dict[str, Any]]:
        """Extract work experience information"""
        experience = []
        
        # Change: Use full text directly instead of section extraction
        experience_section = text
        
        # Split into potential job entries
        job_entries = self._split_experience_entries(experience_section)
        
        for entry in job_entries:
            job_info = self._parse_job_entry(entry)
            if job_info:
                experience.append(job_info)
        
        return experience
    
    def extract_projects(self, text: str) -> List[Dict[str, Any]]:
        """Extract project information"""
        # Change: Use full text directly instead of section extraction
        project_section = text
        
        # Re-use experience splitting for project entries
        project_entries = self._split_experience_entries(project_section) 
        projects = []
        
        for entry in project_entries:
            # Simple parsing for project name and description
            lines = entry.split('\n')
            
            project_name = lines[0].strip()
            description = '\n'.join(lines[1:]).strip()
            
            # Clean up the project name and description
            project_name = re.sub(r'Demo Source Code', '', project_name).strip()  # Remove project links from title
            description = re.sub(r'(Demo|Source Code|Live Link)[:\s]+[^\n]+', '', description, flags=re.IGNORECASE).strip()
            
            if len(project_name) > 5 and len(description) > 10:
                 projects.append({
                    'name': project_name,
                    'description': description,
                    'technologies': [] 
                })
        
        return projects
    
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
        """Parse skills from skills section text with aggressive splitting and cleaning."""
        skills = set()
        
        # Normalize separators (replace bullets, tabs, multiple spaces, etc. with a single comma)
        skills_text = re.sub(r'[-•*#\s]{2,}|\s{2,}', ', ', skills_text)
        skills_text = re.sub(r'[:;|\n\r]+', ',', skills_text)

        # 1. Split by comma and filter empty entries
        skill_items = [item.strip() for item in skills_text.split(',') if item.strip()]
        
        for item in skill_items:
            # Separate skills that are still merged but start with a capital letter (e.g. "NodejsExpress")
            # Split merged words using regex if they are longer than a typical skill name (e.g., > 15 chars)
            if len(item) > 15:
                # Pattern to split by lower-to-upper transition (e.g., 'javaScriptNodejs' -> 'javaScript', 'Nodejs')
                item_parts = re.findall('[A-Z][a-z0-9.]+|[a-z0-9.]+', item)
                # Re-join only if they were originally separated by spaces/punctuation
                if len(item_parts) > 1 and len(item_parts) < 5: 
                    item = ' '.join(item_parts)

            # Final cleanup: remove residual punctuation, link identifiers (Demo, Code, etc.)
            item = re.sub(r'[()]', '', item)
            item = re.sub(r'(Demo|Source Code|Live Link)[:\s]+[^\n]+', '', item, flags=re.IGNORECASE).strip()
            item = re.sub(r'[^a-zA-Z0-9\s\.\+\#-]+$', '', item).strip() 
            item = re.sub(r'^\s*[-•*#\s]+', '', item).strip()

            # Check against a common list for single-word filtering
            if len(item) > 1 and len(item) < 40 and any(char.isalpha() for char in item):
                skills.add(item.title()) # Use .title() to unify case (e.g. 'css' -> 'Css', 'CSS' -> 'Css')
        
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
        """Split experience section into individual job/project entries with lower length threshold."""
        
        # Pattern to split by: Two or more newlines OR a newline followed by a strong title cue.
        split_pattern = r'\n{2,}|\n(?=[A-Z][a-z0-9.]+\s+[A-Z])|\n(?=[A-Z][a-z]+\s+(?:Intern|Project|Developer|Head))'
        
        entries = re.split(split_pattern, experience_text)
        
        # Filter out empty or too-short entries, and entries that are obviously just contact info or headers
        return [
            entry.strip() for entry in entries 
            # CRITICAL CHANGE: Lower the minimum length to 30 to prevent discarding bullet points
            if len(entry.strip()) > 30 and 
            # Relax noise removal: Only filter out entries that are PURELY contact info (phone/email/linkedin)
            not re.search(r'email|phone|\d{3}[-.\s]?\d{3}|linkedin', entry, re.IGNORECASE) and
            any(char.isalpha() for char in entry)
        ]
    
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
