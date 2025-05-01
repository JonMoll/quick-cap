<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { getVideoDevices, createMediaStream, applyStreamToVideo, stopMediaStream } from '$lib/videoUtils';

  let videoDevices: MediaDeviceInfo[] = [];
  let selectedDevice: string = '';
  let selectedResolution: string = '1920x1080';
  let selectedFps: string = '30';
  let captureAudio: boolean = false;
  let isCapturing: boolean = false;
  let videoElement: HTMLVideoElement;
  let stream: MediaStream | null = null;

  const resolutions = [
    { value: '1280x720', label: '1280x720 (720p)' },
    { value: '1920x1080', label: '1920x1080 (1080p)' },
    { value: '2560x1440', label: '2560x1440 (1440p)' },
    { value: '3840x2160', label: '3840x2160 (4K)' }
  ];

  const fpsOptions = [
    { value: '30', label: '30 FPS' },
    { value: '60', label: '60 FPS' },
    { value: '120', label: '120 FPS' }
  ];

  onMount(async () => {
    try {
      // Check if the browser supports mediaDevices
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.error('Your browser does not support media devices API');
        return;
      }

      // Request permission to use devices - use low resolution to make this initial request faster
      const initialStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      
      // Stop the initial stream immediately after getting permission
      initialStream.getTracks().forEach(track => track.stop());
      
      // Get video devices
      videoDevices = await getVideoDevices();
      
      if (videoDevices.length > 0) {
        selectedDevice = videoDevices[0].deviceId;
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  });
  
  onDestroy(() => {
    // Make sure to stop all streams when component is destroyed
    if (stream) {
      stopMediaStream(stream);
    }
  });

  async function startCapture() {
    try {
      if (!selectedDevice) {
        alert('Please select a video device');
        return;
      }

      // Parse the selected resolution
      const [width, height] = selectedResolution.split('x').map(Number);
      
      // If there's an existing stream, stop it first
      if (stream) {
        stopMediaStream(stream);
      }
      
      // Get new media stream with selected settings
      stream = await createMediaStream(
        selectedDevice,
        width,
        height,
        Number(selectedFps),
        captureAudio
      );
      
      // Set capturing state first (UI should update before we try to access video element)
      isCapturing = true;
      
      // We need to wait for the next tick to ensure the video element is rendered
      setTimeout(() => {
        if (videoElement && stream) {
          applyStreamToVideo(videoElement, stream);
          
          // Log success to console for debugging
          console.log('Video capture started successfully', {
            width, 
            height,
            fps: selectedFps,
            audio: captureAudio,
            device: selectedDevice
          });
        }
      }, 100);
    } catch (error) {
      console.error('Error starting capture:', error);
      alert('Failed to start capture: ' + error);
    }
  }
</script>

<svelte:head>
  <title>QuickCap - Video Capture</title>
</svelte:head>

<main class:capturing={isCapturing}>
  {#if !isCapturing}
    <div class="menu-container">
      <div class="menu-content">
        <h1>QuickCap</h1>
        
        <div class="form-group">
          <label for="device-select">Video Device</label>
          <select id="device-select" bind:value={selectedDevice}>
            {#if videoDevices.length === 0}
              <option value="">No video devices found</option>
            {:else}
              {#each videoDevices as device}
                <option value={device.deviceId}>{device.label || `Video device ${device.deviceId.substring(0, 5)}...`}</option>
              {/each}
            {/if}
          </select>
        </div>
        
        <div class="form-group">
          <label for="resolution-select">Resolution</label>
          <select id="resolution-select" bind:value={selectedResolution}>
            {#each resolutions as res}
              <option value={res.value}>{res.label}</option>
            {/each}
          </select>
        </div>
        
        <div class="form-group">
          <label for="fps-select">Frame Rate</label>
          <select id="fps-select" bind:value={selectedFps}>
            {#each fpsOptions as fps}
              <option value={fps.value}>{fps.label}</option>
            {/each}
          </select>
        </div>
        
        <div class="form-group checkbox">
          <input type="checkbox" id="audio-checkbox" bind:checked={captureAudio}>
          <label for="audio-checkbox">Capture audio</label>
        </div>
        
        <button on:click={startCapture}>Start video capture</button>
      </div>
    </div>
  {:else}
    <div class="video-container">
      <!-- Used ref instead of bind:this because it's more reliable with the lifecycle of components -->
      <video 
        bind:this={videoElement} 
        autoplay 
        playsInline 
        muted={!captureAudio}
        controls={false}
        width="100%"
        height="100%"
      ></video>
    </div>
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
    background-color: #000000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }

  main {
    width: 100vw;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #000000;
    color: white;
  }

  h1 {
    font-size: 1.8rem;
    margin: 0 0 1.5rem 0;
    text-align: center;
    font-weight: 500;
  }

  .menu-container {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 400px;
    max-width: 90%;
  }

  .menu-content {
    width: 100%;
    background-color: rgba(40, 40, 40, 0.8);
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
    border-radius: 12px;
    padding: 2rem;
    box-sizing: border-box;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .form-group {
    margin-bottom: 1.2rem;
  }

  label {
    display: block;
    margin-bottom: 0.4rem;
    font-size: 0.9rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.8);
  }

  select {
    width: 100%;
    padding: 0.6rem;
    background-color: rgba(60, 60, 60, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    color: white;
    font-size: 0.9rem;
    -webkit-appearance: none;
    appearance: none;
    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
    background-repeat: no-repeat;
    background-position: right 0.7rem center;
    background-size: 1rem;
  }

  select:focus {
    outline: none;
    border-color: rgba(100, 100, 255, 0.5);
  }

  .checkbox {
    display: flex;
    align-items: center;
  }

  .checkbox label {
    margin-bottom: 0;
    margin-left: 0.5rem;
  }

  input[type="checkbox"] {
    appearance: none;
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    background-color: rgba(60, 60, 60, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  input[type="checkbox"]:checked::before {
    content: '';
    width: 10px;
    height: 10px;
    background-color: #64a0ff;
    border-radius: 2px;
  }

  input[type="checkbox"]:focus {
    outline: none;
    border-color: rgba(100, 100, 255, 0.5);
  }

  button {
    background-color: #0055ff;
    color: white;
    font-weight: 500;
    border: none;
    border-radius: 6px;
    padding: 0.8rem 1rem;
    width: 100%;
    font-size: 1rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  button:hover {
    background-color: #0047d6;
  }

  .video-container {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #000000;
  }

  video {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    background-color: #000000;
    display: block;
    margin: 0 auto;
  }
</style>