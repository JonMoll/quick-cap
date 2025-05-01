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
 * Creates a MediaStream with the specified constraints
 * @param deviceId The ID of the device to use
 * @param width Desired width
 * @param height Desired height
 * @param frameRate Desired frame rate
 * @param audio Whether to include audio
 * @returns Promise with the MediaStream
 */
export async function createMediaStream(
  deviceId: string,
  width: number,
  height: number,
  frameRate: number,
  audio: boolean
): Promise<MediaStream> {
  const constraints: MediaStreamConstraints = {
    video: {
      deviceId: { exact: deviceId },
      width: { ideal: width },
      height: { ideal: height },
      frameRate: { ideal: frameRate }
    },
    audio
  };

  return navigator.mediaDevices.getUserMedia(constraints);
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