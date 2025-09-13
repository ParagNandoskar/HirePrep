import spacy
import requests
import PyPDF2
import docx
import io
import re
import time
import logging
from typing import Dict, List, Any
from utils.text_processor import TextProcessor
from utils.entity_extractor import EntityExtractor

logger = logging.getLogger(__name__)

class ResumeParser:
    def __init__(self):
        """Initialize the resume parser with NLP models and processors"""
        try:
            self.nlp = spacy.load("en_core_web_sm")
            logger.info("Loaded spaCy model successfully")
        except IOError:
            logger.warning("spaCy model not found. Using fallback processing.")
            self.nlp = None
        
        self.text_processor = TextProcessor()
        self.entity_extractor = EntityExtractor(self.nlp)
        
    def parse_resume(self, resume_url: str) -> Dict[str, Any]:
        """
        Parse resume from URL and extract structured information
        
        Args:
            resume_url: URL to the resume file (PDF, DOC, DOCX)
            
        Returns:
            Dictionary containing extracted information and success status
        """
        start_time = time.time()
        
        try:
            # Download and extract text from resume
            text = self._download_and_extract_text(resume_url)
            if not text:
                return {
                    'success': False,
                    'error': 'Failed to extract text from resume'
                }
            
            # Clean and preprocess text
            cleaned_text = self.text_processor.clean_text(text)
            
            # Extract structured information
            extracted_data = self._extract_information(cleaned_text)
            
            processing_time = time.time() - start_time
            logger.info(f"Resume parsing completed in {processing_time:.2f} seconds")
            
            return {
                'success': True,
                'extractedData': extracted_data,
                'processingTime': processing_time
            }
            
        except Exception as e:
            logger.error(f"Resume parsing error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def parse_resume_from_file(self, file_path: str) -> Dict[str, Any]:
        """
        Parse resume from local file and extract structured information
        
        Args:
            file_path: Path to the resume file (PDF, DOC, DOCX)
            
        Returns:
            Dictionary containing extracted information and success status
        """
        start_time = time.time()
        
        try:
            # Extract text from local file
            text = self._extract_text_from_file(file_path)
            if not text:
                return {
                    'success': False,
                    'error': 'Failed to extract text from resume file'
                }
            
            # Clean and preprocess text
            cleaned_text = self.text_processor.clean_text(text)
            
            # Extract structured information
            extracted_data = self._extract_information(cleaned_text)
            extracted_data['resumeText'] = text  # Add full text for analysis
            
            processing_time = time.time() - start_time
            logger.info(f"Resume parsing completed in {processing_time:.2f} seconds")
            
            return {
                'success': True,
                'extractedData': extracted_data,
                'processingTime': processing_time
            }
            
        except Exception as e:
            logger.error(f"Resume parsing error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _extract_text_from_file(self, file_path: str) -> str:
        """Extract text from local file"""
        try:
            file_extension = file_path.lower().split('.')[-1]
            
            if file_extension == 'pdf':
                with open(file_path, 'rb') as file:
                    return self._extract_from_pdf(file.read())
            elif file_extension in ['docx', 'doc']:
                with open(file_path, 'rb') as file:
                    return self._extract_from_docx(file.read())
            else:
                logger.warning(f"Unsupported file type: {file_extension}")
                return ""
                
        except Exception as e:
            logger.error(f"File extraction error: {str(e)}")
            return ""
    
    def _download_and_extract_text(self, url: str) -> str:
        """Download file from URL and extract text content"""
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            
            content_type = response.headers.get('content-type', '').lower()
            file_content = response.content
            
            if 'pdf' in content_type:
                return self._extract_from_pdf(file_content)
            elif 'word' in content_type or 'document' in content_type:
                return self._extract_from_docx(file_content)
            else:
                # Try to determine by file extension or content
                if url.lower().endswith('.pdf'):
                    return self._extract_from_pdf(file_content)
                elif url.lower().endswith(('.docx', '.doc')):
                    return self._extract_from_docx(file_content)
                else:
                    logger.warning(f"Unknown file type for URL: {url}")
                    return ""
                    
        except Exception as e:
            logger.error(f"File download/extraction error: {str(e)}")
            return ""
    
    def _extract_from_pdf(self, file_content: bytes) -> str:
        """Extract text from PDF content"""
        try:
            pdf_file = io.BytesIO(file_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            
            return text
        except Exception as e:
            logger.error(f"PDF extraction error: {str(e)}")
            return ""
    
    def _extract_from_docx(self, file_content: bytes) -> str:
        """Extract text from DOCX content"""
        try:
            doc_file = io.BytesIO(file_content)
            doc = docx.Document(doc_file)
            
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            
            return text
        except Exception as e:
            logger.error(f"DOCX extraction error: {str(e)}")
            return ""
    
    def _extract_information(self, text: str) -> Dict[str, Any]:
        """Extract structured information from resume text"""
        
        # Extract contact information
        contact_info = self.entity_extractor.extract_contact_info(text)
        
        # Extract skills
        skills = self.entity_extractor.extract_skills(text)
        
        # Extract education
        education = self.entity_extractor.extract_education(text)
        
        # Extract work experience
        experience = self.entity_extractor.extract_experience(text)
        
        # Extract certifications
        certifications = self.entity_extractor.extract_certifications(text)
        
        # Extract summary/objective
        summary = self.entity_extractor.extract_summary(text)
        
        # Extract additional entities using spaCy NER
        ner_entities = self.entity_extractor.extract_named_entities(text)
        
        return {
            'contactInfo': contact_info,
            'skills': skills,
            'education': education,
            'experience': experience,
            'certifications': certifications,
            'summary': summary,
            'namedEntities': ner_entities,
            'rawText': text[:1000],  # Store first 1000 chars for reference
        }
