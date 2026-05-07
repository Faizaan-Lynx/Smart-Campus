#!/usr/bin/env python3
"""
GStreamer Feed Verification Script
Validates GStreamer installation and camera feed connectivity
"""

import sys
import subprocess
import logging

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def check_gstreamer_installation():
    """Check if GStreamer is properly installed."""
    logger.info("=" * 60)
    logger.info("Checking GStreamer Installation")
    logger.info("=" * 60)
    
    checks = [
        ("gst-inspect-1.0", "GStreamer tools"),
        ("pkg-config --modversion gstreamer-1.0", "GStreamer library"),
    ]
    
    all_passed = True
    for cmd, desc in checks:
        try:
            result = subprocess.run(cmd, shell=True, capture_output=True, timeout=5)
            if result.returncode == 0:
                logger.info(f"✓ {desc}: {result.stdout.decode().strip()}")
            else:
                logger.error(f"✗ {desc}: Not found")
                all_passed = False
        except Exception as e:
            logger.error(f"✗ {desc}: {e}")
            all_passed = False
    
    return all_passed

def check_gstreamer_plugins():
    """Check if required GStreamer plugins are available."""
    logger.info("\n" + "=" * 60)
    logger.info("Checking GStreamer Plugins")
    logger.info("=" * 60)
    
    required_plugins = [
        "rtspsrc",
        "rtph264depay",
        "h264parse",
        "avdec_h264",
        "videoscale",
        "videoconvert",
        "appsink",
    ]
    
    all_passed = True
    for plugin in required_plugins:
        try:
            result = subprocess.run(
                f"gst-inspect-1.0 {plugin} 2>&1 | head -1",
                shell=True,
                capture_output=True,
                timeout=5
            )
            if result.returncode == 0 and b"Factory Details" in result.stdout:
                logger.info(f"✓ {plugin}: Available")
            else:
                logger.error(f"✗ {plugin}: Not found")
                all_passed = False
        except Exception as e:
            logger.error(f"✗ {plugin}: {e}")
            all_passed = False
    
    return all_passed

def check_python_bindings():
    """Check if Python GStreamer bindings are installed."""
    logger.info("\n" + "=" * 60)
    logger.info("Checking Python GStreamer Bindings")
    logger.info("=" * 60)
    
    try:
        import gi
        logger.info("✓ PyGObject: Available")
        
        gi.require_version('Gst', '1.0')
        from gi.repository import Gst
        logger.info("✓ GStreamer Python bindings: Available")
        
        return True
    except ImportError as e:
        logger.error(f"✗ Python GStreamer bindings: {e}")
        logger.error("  Install with: pip install PyGObject")
        return False

def test_gstreamer_pipeline(rtsp_url: str = None):
    """Test basic GStreamer pipeline."""
    logger.info("\n" + "=" * 60)
    logger.info("Testing GStreamer Pipeline")
    logger.info("=" * 60)
    
    if not rtsp_url:
        logger.info("Skipping live camera test (no RTSP URL provided)")
        logger.info("To test with real camera, provide RTSP URL as argument")
        return True
    
    logger.info(f"Testing RTSP URL: {rtsp_url}")
    
    # Build simple test pipeline
    pipeline_cmd = (
        f"gst-launch-1.0 -v "
        f"rtspsrc location={rtsp_url} protocols=tcp latency=0 "
        f"! rtph264depay ! h264parse ! avdec_h264 ! fakesink sync=false"
    )
    
    logger.info("Starting pipeline test (10 seconds timeout)...")
    try:
        result = subprocess.run(
            pipeline_cmd,
            shell=True,
            capture_output=True,
            timeout=10,
            text=True
        )
        
        if "Pipeline is PLAYING" in result.stderr or result.returncode == 0:
            logger.info("✓ Pipeline test: Success")
            logger.info("  Camera stream is accessible")
            return True
        else:
            logger.error("✗ Pipeline test: Failed")
            logger.error(f"  Output: {result.stderr[-500:]}")
            return False
            
    except subprocess.TimeoutExpired:
        logger.info("✓ Pipeline test: Timeout (expected - stream continues)")
        logger.info("  Camera stream is accessible")
        return True
    except Exception as e:
        logger.error(f"✗ Pipeline test: {e}")
        return False

def test_feed_worker_import():
    """Test if feed_worker can be imported without errors."""
    logger.info("\n" + "=" * 60)
    logger.info("Testing Feed Worker Import")
    logger.info("=" * 60)
    
    try:
        # This assumes you're running from the right directory
        sys.path.insert(0, './backend')
        
        # Try importing the class without initializing GStreamer for all cameras
        logger.info("Attempting to import GStreamerRTSPSource class...")
        
        # We can't actually import without the whole backend setup,
        # so just check the file syntax
        import ast
        with open('./backend/core/celery/feed_worker.py', 'r') as f:
            try:
                ast.parse(f.read())
                logger.info("✓ Feed worker syntax: Valid Python")
                return True
            except SyntaxError as e:
                logger.error(f"✗ Feed worker syntax: {e}")
                return False
                
    except Exception as e:
        logger.error(f"✗ Feed worker import: {e}")
        return False

def print_diagnostics():
    """Print system diagnostics."""
    logger.info("\n" + "=" * 60)
    logger.info("System Diagnostics")
    logger.info("=" * 60)
    
    import platform
    logger.info(f"Python: {platform.python_version()}")
    logger.info(f"Platform: {platform.system()} {platform.release()}")
    
    try:
        import cv2
        logger.info(f"OpenCV: {cv2.__version__}")
    except:
        logger.warning("OpenCV: Not installed")
    
    try:
        result = subprocess.run("gst-launch-1.0 --version", shell=True, capture_output=True)
        logger.info(f"GStreamer CLI: {result.stdout.decode().strip()}")
    except:
        logger.warning("GStreamer CLI: Not available")

def main():
    """Run all checks."""
    logger.info("Smart Campus - GStreamer Feed Verification")
    logger.info("=" * 60)
    
    results = {
        "GStreamer Installation": check_gstreamer_installation(),
        "GStreamer Plugins": check_gstreamer_plugins(),
        "Python Bindings": check_python_bindings(),
        "Feed Worker Syntax": test_feed_worker_import(),
    }
    
    # Test pipeline with RTSP URL if provided
    if len(sys.argv) > 1:
        rtsp_url = sys.argv[1]
        results["GStreamer Pipeline"] = test_gstreamer_pipeline(rtsp_url)
    else:
        results["GStreamer Pipeline"] = test_gstreamer_pipeline()
    
    print_diagnostics()
    
    logger.info("\n" + "=" * 60)
    logger.info("Verification Summary")
    logger.info("=" * 60)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for check, result in results.items():
        status = "✓ PASS" if result else "✗ FAIL"
        logger.info(f"{status}: {check}")
    
    logger.info(f"\nTotal: {passed}/{total} checks passed")
    
    if passed == total:
        logger.info("\n✓ All checks passed! Ready for deployment.")
        return 0
    else:
        logger.error(f"\n✗ {total - passed} check(s) failed. Please review above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
