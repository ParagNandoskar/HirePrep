"""
Unified Flask Application Launcher for Video and Audio Analysis Services
Supports running either service individually or both simultaneously
"""

import os
import sys
import logging
from threading import Thread

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def run_video_service(port=8001):
    """Run the video analysis service."""
    logger.info(f"Starting Video Analysis Service on port {port}...")
    os.environ['PORT'] = str(port)
    
    # Import and run video analysis
    import video_analysis
    video_analysis.app.run(
        host='0.0.0.0',
        port=port,
        debug=False,
        use_reloader=False
    )

def run_audio_service(port=8002):
    """Run the audio analysis service."""
    logger.info(f"Starting Audio Analysis Service on port {port}...")
    os.environ['PORT'] = str(port)
    
    # Import and run audio analysis
    import audio_analysis
    audio_analysis.app.run(
        host='0.0.0.0',
        port=port,
        debug=False,
        use_reloader=False
    )

def run_both_services(video_port=8001, audio_port=8002):
    """Run both services simultaneously using threads."""
    logger.info("Starting both Video and Audio Analysis Services...")
    
    # Create threads for each service
    video_thread = Thread(target=run_video_service, args=(video_port,), daemon=True)
    audio_thread = Thread(target=run_audio_service, args=(audio_port,), daemon=True)
    
    # Start both threads
    video_thread.start()
    audio_thread.start()
    
    logger.info(f"✅ Video Analysis running on http://localhost:{video_port}")
    logger.info(f"✅ Audio Analysis running on http://localhost:{audio_port}")
    logger.info("Press Ctrl+C to stop both services")
    
    # Keep main thread alive
    try:
        video_thread.join()
        audio_thread.join()
    except KeyboardInterrupt:
        logger.info("\n🛑 Shutting down services...")
        sys.exit(0)

if __name__ == '__main__':
    # Get service type from environment variable
    service_type = os.getenv('SERVICE_TYPE', 'both').lower()
    
    # Get custom ports if specified
    video_port = int(os.getenv('VIDEO_PORT', 8001))
    audio_port = int(os.getenv('AUDIO_PORT', 8002))
    
    logger.info("="*60)
    logger.info("🚀 Python Behavioral Analysis Services Launcher")
    logger.info("="*60)
    
    try:
        if service_type == 'video':
            logger.info("📹 Running VIDEO ANALYSIS ONLY")
            run_video_service(video_port)
            
        elif service_type == 'audio':
            logger.info("🎤 Running AUDIO ANALYSIS ONLY")
            run_audio_service(audio_port)
            
        elif service_type == 'both':
            logger.info("📹🎤 Running BOTH SERVICES")
            run_both_services(video_port, audio_port)
            
        else:
            logger.error(f"❌ Invalid SERVICE_TYPE: {service_type}")
            logger.info("Valid options: 'video', 'audio', 'both'")
            logger.info("\nUsage examples:")
            logger.info("  $env:SERVICE_TYPE='both'; python app.py")
            logger.info("  $env:SERVICE_TYPE='video'; python app.py")
            logger.info("  $env:SERVICE_TYPE='audio'; python app.py")
            logger.info("  $env:SERVICE_TYPE='both'; $env:VIDEO_PORT=9001; $env:AUDIO_PORT=9002; python app.py")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"❌ Failed to start service: {e}")
        sys.exit(1)
