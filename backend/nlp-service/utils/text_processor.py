import re
import string
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)

class TextProcessor:
    def __init__(self):
        """Initialize text processor with common patterns and stop words"""
        self.stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
            'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
            'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your',
            'his', 'its', 'our', 'their'
        }
        
        # Common resume section headers
        self.section_headers = {
            'experience': ['experience', 'work experience', 'employment', 'work history', 'professional experience'],
            'education': ['education', 'academic background', 'qualifications', 'academic qualifications'],
            'skills': ['skills', 'technical skills', 'core competencies', 'expertise', 'technologies'],
            'certifications': ['certifications', 'certificates', 'professional certifications', 'licenses'],
            'summary': ['summary', 'profile', 'objective', 'professional summary', 'career objective'],
            'contact': ['contact', 'contact information', 'personal information']
        }
    
    def clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        if not text:
            return ""
        
        # Remove extra whitespace and normalize line breaks
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'\n\s*\n', '\n', text)
        
        # Remove special characters but keep important punctuation
        text = re.sub(r'[^\w\s\.\,\;\:\-\(\)\@\+\#]', ' ', text)
        
        # Remove extra spaces
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text
    
    def extract_sections(self, text: str) -> Dict[str, str]:
        """Extract different sections from resume text"""
        sections = {}
        text_lower = text.lower()
        
        for section_name, headers in self.section_headers.items():
            section_content = self._extract_section_content(text, text_lower, headers)
            if section_content:
                sections[section_name] = section_content
        
        return sections
    
    def _extract_section_content(self, text: str, text_lower: str, headers: List[str]) -> str:
        """Extract content for a specific section using robust header finding and boundary detection."""
        
        all_headers = []
        for header_list in self.section_headers.values():
            all_headers.extend(header_list)
        all_headers.extend(['projects', 'personal projects', 'key projects', 'major projects', 'extra-curricular activities', 'certificates', 'licenses']) # Include all known headers
        
        # 1. Find the start of the current section
        # Pattern: Look for the header as a distinct line item (start of line + header + optional punctuation/whitespace)
        current_header_pattern = r'(?:^|\n)\s*(' + '|'.join([re.escape(h) for h in headers]) + r')\s*[:\s]*'
        
        start_match = re.search(current_header_pattern, text, re.IGNORECASE)
        
        if not start_match:
            return ""

        # Content starts immediately after the matched header and any following punctuation/whitespace
        content_start = start_match.end()
        
        # 2. Find the end of the current section (start of the next header)
        content_end = len(text)
        
        # Compile pattern for ANY other header to define the end boundary
        current_headers_lower = [h.lower() for h in headers]
        next_header_candidates = [re.escape(h) for h in all_headers if h.lower() not in current_headers_lower]
        
        if next_header_candidates:
            next_header_pattern = '|'.join(next_header_candidates)
            
            # Look for the start of the NEXT header. Use a minimal lookahead pattern.
            # This looks for a newline or start of string, followed by a strong header.
            next_match = re.search(rf'(\n|^)\s*({next_header_pattern})', text[content_start:], re.IGNORECASE)

            if next_match:
                # The content ends right where the next header's match starts
                content_end = content_start + next_match.start()
            
        # 3. Extract and clean content
        content = text[content_start:content_end].strip()
        
        # Remove final leading/trailing bullets/junk that might interfere with child parsers
        content = re.sub(r'^\s*[-•*#\s]*\n', '', content).strip()
        
        return content
    
    def tokenize(self, text: str) -> List[str]:
        """Tokenize text into words"""
        if not text:
            return []
        
        # Convert to lowercase and split
        words = text.lower().split()
        
        # Remove punctuation and filter out stop words
        tokens = []
        for word in words:
            # Remove punctuation
            word = word.translate(str.maketrans('', '', string.punctuation))
            
            # Filter out empty strings, numbers, and stop words
            if word and not word.isdigit() and word not in self.stop_words and len(word) > 2:
                tokens.append(word)
        
        return tokens
    
    def extract_phone_numbers(self, text: str) -> List[str]:
        """Extract phone numbers from text"""
        # Various phone number patterns
        patterns = [
            r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b',  # 123-456-7890 or 123.456.7890 or 123 456 7890
            r'\(\d{3}\)\s?\d{3}[-.\s]?\d{4}',      # (123) 456-7890
            r'\+\d{1,3}[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}',  # +1-123-456-7890
        ]
        
        phone_numbers = []
        for pattern in patterns:
            matches = re.findall(pattern, text)
            phone_numbers.extend(matches)
        
        return list(set(phone_numbers))  # Remove duplicates
    
    def extract_emails(self, text: str) -> List[str]:
        """Extract email addresses from text"""
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, text)
        return list(set(emails))
    
    def extract_urls(self, text: str) -> List[str]:
        """Extract URLs from text"""
        url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
        urls = re.findall(url_pattern, text)
        return list(set(urls))
    
    def extract_dates(self, text: str) -> List[str]:
        """Extract dates from text"""
        date_patterns = [
            r'\b\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}\b',  # MM/DD/YYYY or MM-DD-YYYY
            r'\b\d{4}[/\-]\d{1,2}[/\-]\d{1,2}\b',    # YYYY/MM/DD or YYYY-MM-DD
            r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\b',  # Month DD, YYYY
            r'\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\b',   # DD Month YYYY
            r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\b',              # Month YYYY
            r'\b\d{4}\b'  # Just year
        ]
        
        dates = []
        for pattern in date_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            dates.extend(matches)
        
        return list(set(dates))
    
    def extract_years_experience(self, text: str) -> List[int]:
        """Extract years of experience from text"""
        patterns = [
            r'(\d+)\+?\s*years?\s*(?:of\s*)?experience',
            r'(\d+)\+?\s*yrs?\s*(?:of\s*)?experience',
            r'experience.*?(\d+)\+?\s*years?',
            r'(\d+)\+?\s*years?\s*in',
        ]
        
        years = []
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                try:
                    years.append(int(match))
                except ValueError:
                    continue
        
        return sorted(list(set(years)), reverse=True)  # Return unique years, highest first
