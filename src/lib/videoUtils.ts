/**
 * Video utility functions for QuickCap
 */

/**
 * Gets all video input devices from the browser
 * @returns Promise with array of video input devices
 */
export async function getVideoDevices(): Promise<MediaDeviceInfo[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'videoinput');
  } catch (error) {
    console.error('Error accessing media devices:', error);
    return [];
  }
}

/**
 * Gets all audio input devices from the browser
 * @returns Promise with array of audio input devices
 */
export async function getAudioDevices(): Promise<MediaDeviceInfo[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'audioinput');
  } catch (error) {
    console.error('Error accessing audio devices:', error);
    return [];
  }
}

/**
 * Creates a MediaStream with the specified constraints
 * @param deviceId The ID of the device to use
 * @param width Desired width
 * @param height Desired height
 * @param frameRate Desired frame rate
 * @param audio Whether to include audio (system sound)
 * @returns Promise with the MediaStream
 */
export async function createMediaStream(
  deviceId: string,
  width: number,
  height: number,
  frameRate: number,
  audio: boolean
): Promise<MediaStream> {
  // First, create a stream with only video from the specified device
  const videoConstraints: MediaStreamConstraints = {
    video: {
      deviceId: { exact: deviceId },
      width: { ideal: width },
      height: { ideal: height },
      frameRate: { ideal: frameRate }
    },
    audio: false
  };

  // Get the video stream first
  const videoStream = await navigator.mediaDevices.getUserMedia(videoConstraints);
  
  // If audio is not required, return just the video stream
  if (!audio) {
    return videoStream;
  }
  
  try {
    // When using capture cards or HDMI sources, they typically appear as both
    // video and audio input devices with the same or similar name
    // Let's try to find a matching audio input
    const audioDevices = await getAudioDevices();
    console.log('Available audio devices:', audioDevices);
    
    // Get video devices for comparison
    const videoDevices = await getVideoDevices();
    
    // Try to find audio device that matches our video device (could be same device or similarly named)
    let audioDevice = audioDevices.find(ad => 
      ad.deviceId === deviceId || // Same device ID
      (ad.label && videoDevices.some(vd => vd.deviceId === deviceId && vd.label && ad.label.includes(vd.label.split('(')[0].trim())))
    );
    
    // If no matching device found, try to use system audio via getDisplayMedia
    if (!audioDevice) {
      console.log('No matching audio device found, trying display capture for system audio');
      // @ts-ignore - Some TypeScript environments might not recognize this API
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: false,
        audio: true
      });
      
      const audioTracks = displayStream.getAudioTracks();
      if (audioTracks.length > 0) {
        // Add audio tracks to the video stream
        audioTracks.forEach(track => {
          videoStream.addTrack(track);
        });
      }
    } else {
      // We found a matching audio device, use it
      console.log('Using matching audio device:', audioDevice);
      const audioStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: {
          deviceId: { exact: audioDevice.deviceId },
          // Disable audio processing to get raw audio
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      
      const audioTracks = audioStream.getAudioTracks();
      if (audioTracks.length > 0) {
        // Add audio tracks to the video stream
        audioTracks.forEach(track => {
          videoStream.addTrack(track);
        });
      }
    }
    
    return videoStream;
  } catch (error) {
    console.error('Error capturing system audio, falling back to video only:', error);
    // If audio capture fails, just return the video stream
    return videoStream;
  }
}

/**
 * Apply a media stream to a video element
 * @param videoElement The video element to apply the stream to
 * @param stream The media stream
 */
export function applyStreamToVideo(
  videoElement: HTMLVideoElement, 
  stream: MediaStream
): void {
  if (!videoElement || !stream) return;
  
  videoElement.srcObject = stream;
  videoElement.onloadedmetadata = () => {
    videoElement.play().catch(e => {
      console.error('Error playing video:', e);
    });
  };
}

/**
 * Stops all tracks in a media stream
 * @param stream The media stream to stop
 */
export function stopMediaStream(stream: MediaStream | null): void {
  if (!stream) return;
  
  stream.getTracks().forEach(track => {
    track.stop();
  });
}