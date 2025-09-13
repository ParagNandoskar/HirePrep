#!/usr/bin/env python3
"""
Test script to parse the actual resume file and see what's extracted
"""
import sys
import os
import json

# Add the current directory to path so we can import services
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.resume_parser import ResumeParser
from utils.nlp_utils import NLPUtils

def parse_actual_resume():
    """Parse the actual Durvesh resume and show extracted data"""
    resume_path = r"C:\Users\durvesh\Desktop\resume\commerce_resume.pdf"
    
    print("🔍 Parsing Your Actual Resume")
    print("=" * 50)
    print(f"📄 File: {resume_path}")
    
    # Check if file exists
    if not os.path.exists(resume_path):
        print(f"❌ File not found: {resume_path}")
        return
    
    # Initialize parser
    resume_parser = ResumeParser()
    nlp_utils = NLPUtils()
    
    try:
        # Parse the resume
        print("\n🤖 Starting resume parsing...")
        result = resume_parser.parse_resume_from_file(resume_path)
        
        if not result['success']:
            print(f"❌ Failed to parse resume: {result.get('error')}")
            return
        
        extracted_data = result['extractedData']
        
        print("✅ Resume parsed successfully!")
        print(f"⏱️  Processing time: {result.get('processingTime', 0):.2f} seconds")
        
        # Display extracted information
        print("\n" + "="*60)
        print("📋 EXTRACTED INFORMATION FROM YOUR RESUME")
        print("="*60)
        
        # Contact Information
        if extracted_data.get('contactInfo'):
            print("\n👤 CONTACT INFORMATION:")
            contact = extracted_data['contactInfo']
            for key, value in contact.items():
                if value:
                    print(f"   {key.title()}: {value}")
        
        # Skills
        if extracted_data.get('skills'):
            print(f"\n🛠️  SKILLS EXTRACTED ({len(extracted_data['skills'])} found):")
            for i, skill in enumerate(extracted_data['skills'], 1):
                print(f"   {i}. {skill}")
            
            # Analyze skills
            print(f"\n🔍 SKILLS ANALYSIS:")
            skills_analysis = nlp_utils.analyze_skills(extracted_data['skills'])
            
            if 'standardized' in skills_analysis:
                print(f"📊 Standardized Skills:")
                for skill_obj in skills_analysis['standardized']:
                    original = skill_obj.get('original', skill_obj)
                    standardized = skill_obj.get('standardized', skill_obj)
                    category = skill_obj.get('category', 'other')
                    print(f"   • {original} → {standardized} [{category}]")
            
            if 'categories' in skills_analysis:
                print(f"\n📂 Skills by Category:")
                for category, skills in skills_analysis['categories'].items():
                    print(f"   {category.title()}: {', '.join(skills)}")
        else:
            print("\n🛠️  SKILLS: None extracted")
        
        # Education
        if extracted_data.get('education'):
            print(f"\n🎓 EDUCATION ({len(extracted_data['education'])} entries):")
            for i, edu in enumerate(extracted_data['education'], 1):
                print(f"   {i}. {edu}")
        else:
            print("\n🎓 EDUCATION: None extracted")
        
        # Experience
        if extracted_data.get('experience'):
            print(f"\n💼 WORK EXPERIENCE ({len(extracted_data['experience'])} entries):")
            for i, exp in enumerate(extracted_data['experience'], 1):
                print(f"   {i}. {exp}")
        else:
            print("\n💼 WORK EXPERIENCE: None extracted")
        
        # Summary
        if extracted_data.get('summary'):
            print(f"\n📝 SUMMARY/OBJECTIVE:")
            print(f"   {extracted_data['summary']}")
        
        # Named Entities
        if extracted_data.get('namedEntities'):
            print(f"\n🏷️  NAMED ENTITIES:")
            entities = extracted_data['namedEntities']
            for entity_type, entity_list in entities.items():
                if entity_list:
                    print(f"   {entity_type}: {', '.join(entity_list)}")
        
        # Raw text sample
        if extracted_data.get('rawText'):
            print(f"\n📄 RESUME TEXT SAMPLE (first 500 chars):")
            print(f"   {extracted_data['rawText'][:500]}...")
        
        # Extract keywords from the full text
        if extracted_data.get('resumeText'):
            print(f"\n🔑 KEYWORD ANALYSIS:")
            keywords = nlp_utils.extract_keywords(extracted_data['resumeText'], 15)
            print(f"📝 Top Keywords Extracted:")
            for i, keyword_obj in enumerate(keywords[:10], 1):
                if isinstance(keyword_obj, dict):
                    keyword = keyword_obj.get('keyword', keyword_obj)
                    score = keyword_obj.get('score', 'N/A')
                    category = keyword_obj.get('category', 'other')
                    print(f"   {i}. {keyword} (Score: {score:.3f}, Category: {category})")
                else:
                    print(f"   {i}. {keyword_obj}")
        
        print("\n" + "="*60)
        print("🔍 ANALYSIS COMPLETE")
        print("="*60)
        
        # Show potential issues
        print(f"\n💡 OBSERVATIONS:")
        print(f"   📊 Total skills extracted: {len(extracted_data.get('skills', []))}")
        print(f"   🎓 Education entries: {len(extracted_data.get('education', []))}")
        print(f"   💼 Experience entries: {len(extracted_data.get('experience', []))}")
        
        if not extracted_data.get('skills'):
            print(f"   ⚠️  No skills were extracted - this might indicate:")
            print(f"      • Skills section not clearly labeled")
            print(f"      • Skills embedded in other sections")
            print(f"      • PDF text extraction issues")
        
        return extracted_data
        
    except Exception as e:
        print(f"❌ Error parsing resume: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    parse_actual_resume()
