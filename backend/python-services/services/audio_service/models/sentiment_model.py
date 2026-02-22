#!/usr/bin/env python3
"""
Sentiment Analysis Model
Uses DistilBERT loaded from local directory (no runtime download)
"""

import os
import logging
from pathlib import Path
from transformers import pipeline
from typing import Dict
import warnings

warnings.filterwarnings('ignore', category=UserWarning)

logger = logging.getLogger(__name__)


class SentimentAnalyzer:
    """
    Singleton class for DistilBERT-based sentiment analysis
    
    Model: distilbert-base-uncased-finetuned-sst-2-english
    Input: Text transcript
    Output: Sentiment label + score
    
    Labels: POSITIVE, NEGATIVE
    """
    
    _instance = None
    _initialized = False
    
    def __new__(cls):
        """Singleton pattern"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize model (only once)"""
        if self._initialized:
            return
            
        logger.info("=" * 60)
        logger.info("📖 Initializing DistilBERT Sentiment Model")
        logger.info("=" * 60)
        
        try:
            import time
            start = time.time()
            
            # Model configuration
            self.model_name = "distilbert-base-uncased-finetuned-sst-2-english"
            
            # Local model path
            script_dir = Path(__file__).parent.parent
            self.local_model_path = script_dir / "local_models" / "distilbert-sentiment"
            
            # Check if local model exists
            if not self.local_model_path.exists():
                error_msg = (
                    f"❌ Local model not found at: {self.local_model_path}\n"
                    "   Run 'python download_models.py' first to download models.\n"
                    "   This is required for offline/production deployment."
                )
                logger.error(error_msg)
                raise FileNotFoundError(error_msg)
            
            logger.info(f"   ✅ Using LOCAL model (no internet required)")
            logger.info(f"   Path: {self.local_model_path}")
            
            # Load pipeline from local directory
            logger.info(f"   Loading model: {self.model_name}")
            
            self.pipeline = pipeline(
                "sentiment-analysis",
                model=str(self.local_model_path)
            )
            
            elapsed = time.time() - start
            logger.info(f"   ✅ Model loaded in {elapsed:.2f}s")
            logger.info("   Labels: POSITIVE, NEGATIVE")
            logger.info("=" * 60 + "\n")
            
            self._initialized = True
            
        except Exception as e:
            logger.error(f"❌ Failed to load sentiment model: {e}")
            raise
    
    def analyze(self, text: str) -> Dict:
        """
        Analyze sentiment of text
        
        Args:
            text: Input text (transcript)
        
        Returns:
            {
                'label': str,              # 'POSITIVE' or 'NEGATIVE'
                'score': float,            # Model confidence (0.0-1.0)
                'sentiment_score': float,  # Normalized to 0-100
                'polarity': float          # -1.0 to +1.0
            }
        """
        try:
            if not text or len(text.strip()) == 0:
                logger.warning("Empty text provided for sentiment analysis")
                return self._get_neutral_sentiment()
            
            # Truncate if too long (DistilBERT has 512 token limit)
            max_length = 500  # Conservative character limit
            if len(text) > max_length:
                text = text[:max_length]
                logger.warning(f"Text truncated to {max_length} characters")
            
            # Run sentiment analysis
            result = self.pipeline(text)[0]
            label = result['label']
            model_confidence = result['score']
            
            # Convert to 0-100 scale
            # POSITIVE: 50-100, NEGATIVE: 0-50
            if label == 'POSITIVE':
                sentiment_score = 50 + (model_confidence * 50)
            else:
                sentiment_score = 50 - (model_confidence * 50)
            
            # Calculate polarity (-1 to +1)
            polarity = (sentiment_score - 50) / 50
            
            logger.info(f"💬 Sentiment: {label} (confidence: {model_confidence:.2%}, score: {sentiment_score:.1f}/100)")
            
            return {
                'label': label,
                'score': float(model_confidence),
                'sentiment_score': float(sentiment_score),
                'polarity': float(polarity)
            }
            
        except Exception as e:
            logger.error(f"❌ Sentiment analysis error: {e}")
            return self._get_neutral_sentiment(error=str(e))
    
    def analyze_sentence_by_sentence(self, text: str) -> Dict:
        """
        Analyze sentiment sentence by sentence for detailed analysis
        
        Returns:
            {
                'overall_sentiment': str,
                'overall_score': float,
                'sentence_sentiments': list,
                'positive_ratio': float,
                'negative_ratio': float
            }
        """
        try:
            # Split into sentences (simple approach)
            sentences = [s.strip() for s in text.split('.') if s.strip()]
            
            if not sentences:
                return {
                    'overall_sentiment': 'NEUTRAL',
                    'overall_score': 50.0,
                    'sentence_sentiments': [],
                    'positive_ratio': 0.5,
                    'negative_ratio': 0.5
                }
            
            # Analyze each sentence
            sentence_results = []
            for sentence in sentences:
                if len(sentence) > 10:  # Skip very short sentences
                    result = self.analyze(sentence)
                    sentence_results.append({
                        'sentence': sentence,
                        'sentiment': result['label'],
                        'score': result['sentiment_score']
                    })
            
            if not sentence_results:
                return self._get_neutral_sentiment()
            
            # Calculate overall metrics
            positive_count = sum(1 for r in sentence_results if r['sentiment'] == 'POSITIVE')
            negative_count = len(sentence_results) - positive_count
            
            positive_ratio = positive_count / len(sentence_results)
            negative_ratio = negative_count / len(sentence_results)
            
            # Overall sentiment (majority vote)
            overall_sentiment = 'POSITIVE' if positive_ratio > 0.5 else 'NEGATIVE'
            overall_score = sum(r['score'] for r in sentence_results) / len(sentence_results)
            
            return {
                'overall_sentiment': overall_sentiment,
                'overall_score': float(overall_score),
                'sentence_sentiments': sentence_results,
                'positive_ratio': float(positive_ratio),
                'negative_ratio': float(negative_ratio)
            }
            
        except Exception as e:
            logger.error(f"❌ Sentence-by-sentence analysis error: {e}")
            return self._get_neutral_sentiment(error=str(e))
    
    def _get_neutral_sentiment(self, error: str = None) -> Dict:
        """Return neutral sentiment (fallback)"""
        result = {
            'label': 'NEUTRAL',
            'score': 0.5,
            'sentiment_score': 50.0,
            'polarity': 0.0
        }
        if error:
            result['error'] = error
        return result
    
    def get_sentiment_description(self, sentiment_score: float) -> str:
        """
        Get human-readable description of sentiment
        
        Args:
            sentiment_score: Score 0-100
        
        Returns:
            Description string
        """
        if sentiment_score >= 80:
            return "Very Positive"
        elif sentiment_score >= 60:
            return "Positive"
        elif sentiment_score >= 40:
            return "Neutral"
        elif sentiment_score >= 20:
            return "Negative"
        else:
            return "Very Negative"


# Global instance (lazy-loaded)
_sentiment_model = None

def get_sentiment_model() -> SentimentAnalyzer:
    """Get or create global sentiment model instance"""
    global _sentiment_model
    if _sentiment_model is None:
        _sentiment_model = SentimentAnalyzer()
    return _sentiment_model
