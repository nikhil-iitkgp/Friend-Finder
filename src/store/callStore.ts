import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { UserProfileResponse } from '@/lib/validations';

type CallStatus = 'idle' | 'calling' | 'incoming' | 'connected' | 'ended' | 'failed';

interface CallState {
  // Call status
  status: CallStatus;
  isInCall: boolean;
  isVideo: boolean;
  
  // Participants
  caller: UserProfileResponse | null;
  callee: UserProfileResponse | null;
  currentCallUser: UserProfileResponse | null; // The other user in the call
  
  // Media streams
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  
  // Media controls
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isMicMuted: boolean;
  isCameraOff: boolean;
  
  // WebRTC connection
  peerConnection: RTCPeerConnection | null;
  
  // Call timing
  callStartTime: Date | null;
  callDuration: number; // in seconds
  
  // Error handling
  error: string | null;
  
  // UI state
  isCallModalOpen: boolean;
  showCallControls: boolean;
  
  // Actions
  setStatus: (status: CallStatus) => void;
  setError: (error: string | null) => void;
  setCallModalOpen: (open: boolean) => void;
  setShowCallControls: (show: boolean) => void;
  
  // Media control actions
  toggleVideo: () => void;
  toggleAudio: () => void;
  toggleMic: () => void;
  toggleCamera: () => void;
  
  // Stream management
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  setPeerConnection: (pc: RTCPeerConnection | null) => void;
  
  // Call actions
  initiateCall: (user: UserProfileResponse, isVideo: boolean) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  
  // WebRTC signaling
  createOffer: () => Promise<RTCSessionDescriptionInit>;
  createAnswer: (offer: RTCSessionDescriptionInit) => Promise<RTCSessionDescriptionInit>;
  setRemoteDescription: (description: RTCSessionDescriptionInit) => Promise<void>;
  addIceCandidate: (candidate: RTCIceCandidateInit) => Promise<void>;
  
  // Utility functions
  startCallTimer: () => void;
  stopCallTimer: () => void;
  resetCall: () => void;
  getUserMedia: (video: boolean, audio: boolean) => Promise<MediaStream>;
  setupPeerConnection: () => RTCPeerConnection;
}

// Timer interval reference
let callTimerInterval: NodeJS.Timeout | null = null;

export const useCallStore = create<CallState>()(
  devtools(
    (set, get) => ({
      // Initial state
      status: 'idle',
      isInCall: false,
      isVideo: false,
      caller: null,
      callee: null,
      currentCallUser: null,
      localStream: null,
      remoteStream: null,
      isVideoEnabled: true,
      isAudioEnabled: true,
      isMicMuted: false,
      isCameraOff: false,
      peerConnection: null,
      callStartTime: null,
      callDuration: 0,
      error: null,
      isCallModalOpen: false,
      showCallControls: true,
      
      // Basic actions
      setStatus: (status) => {
        set({ status, isInCall: status === 'connected' });
        
        if (status === 'connected') {
          get().startCallTimer();
        } else if (status === 'ended' || status === 'failed') {
          get().stopCallTimer();
        }
      },
      
      setError: (error) => set({ error }),
      setCallModalOpen: (isCallModalOpen) => set({ isCallModalOpen }),
      setShowCallControls: (showCallControls) => set({ showCallControls }),
      
      // Media control actions
      toggleVideo: () => {
        const { isVideoEnabled, localStream } = get();
        
        if (localStream) {
          const videoTracks = localStream.getVideoTracks();
          videoTracks.forEach(track => {
            track.enabled = !isVideoEnabled;
          });
        }
        
        set({ isVideoEnabled: !isVideoEnabled, isCameraOff: isVideoEnabled });
      },
      
      toggleAudio: () => {
        const { isAudioEnabled, localStream } = get();
        
        if (localStream) {
          const audioTracks = localStream.getAudioTracks();
          audioTracks.forEach(track => {
            track.enabled = !isAudioEnabled;
          });
        }
        
        set({ isAudioEnabled: !isAudioEnabled, isMicMuted: isAudioEnabled });
      },
      
      toggleMic: () => get().toggleAudio(),
      toggleCamera: () => get().toggleVideo(),
      
      // Stream management
      setLocalStream: (localStream) => set({ localStream }),
      setRemoteStream: (remoteStream) => set({ remoteStream }),
      setPeerConnection: (peerConnection) => set({ peerConnection }),
      
      // Call actions
      initiateCall: async (user, isVideo) => {
        try {
          set({ 
            status: 'calling',
            callee: user,
            currentCallUser: user,
            isVideo,
            error: null,
            isCallModalOpen: true
          });
          
          // Get user media
          const stream = await get().getUserMedia(isVideo, true);
          get().setLocalStream(stream);
          
          // Setup peer connection
          const pc = get().setupPeerConnection();
          get().setPeerConnection(pc);
          
          // Add local stream to peer connection
          stream.getTracks().forEach(track => {
            pc.addTrack(track, stream);
          });
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to initiate call';
          set({ 
            status: 'failed',
            error: errorMessage 
          });
          throw error;
        }
      },
      
      acceptCall: async () => {
        try {
          const { caller, isVideo } = get();
          
          set({ 
            status: 'connected',
            currentCallUser: caller,
            error: null,
            isCallModalOpen: true
          });
          
          // Get user media
          const stream = await get().getUserMedia(isVideo, true);
          get().setLocalStream(stream);
          
          // Setup peer connection if not already done
          let { peerConnection } = get();
          if (!peerConnection) {
            peerConnection = get().setupPeerConnection();
            get().setPeerConnection(peerConnection);
          }
          
          // Add local stream to peer connection
          stream.getTracks().forEach(track => {
            peerConnection!.addTrack(track, stream);
          });
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to accept call';
          set({ 
            status: 'failed',
            error: errorMessage 
          });
          throw error;
        }
      },
      
      rejectCall: () => {
        get().resetCall();
        set({ status: 'ended' });
      },
      
      endCall: () => {
        const { localStream, remoteStream, peerConnection } = get();
        
        // Stop all tracks
        if (localStream) {
          localStream.getTracks().forEach(track => track.stop());
        }
        if (remoteStream) {
          remoteStream.getTracks().forEach(track => track.stop());
        }
        
        // Close peer connection
        if (peerConnection) {
          peerConnection.close();
        }
        
        get().resetCall();
        set({ status: 'ended' });
      },
      
      // WebRTC signaling
      createOffer: async () => {
        const { peerConnection } = get();
        if (!peerConnection) {
          throw new Error('Peer connection not initialized');
        }
        
        const offer = await peerConnection.createOffer({
          offerToReceiveVideo: get().isVideo,
          offerToReceiveAudio: true,
        });
        
        await peerConnection.setLocalDescription(offer);
        return offer;
      },
      
      createAnswer: async (offer) => {
        const { peerConnection } = get();
        if (!peerConnection) {
          throw new Error('Peer connection not initialized');
        }
        
        await peerConnection.setRemoteDescription(offer);
        
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        return answer;
      },
      
      setRemoteDescription: async (description) => {
        const { peerConnection } = get();
        if (!peerConnection) {
          throw new Error('Peer connection not initialized');
        }
        
        await peerConnection.setRemoteDescription(description);
      },
      
      addIceCandidate: async (candidate) => {
        const { peerConnection } = get();
        if (!peerConnection) {
          throw new Error('Peer connection not initialized');
        }
        
        await peerConnection.addIceCandidate(candidate);
      },
      
      // Utility functions
      startCallTimer: () => {
        set({ 
          callStartTime: new Date(),
          callDuration: 0 
        });
        
        if (callTimerInterval) {
          clearInterval(callTimerInterval);
        }
        
        callTimerInterval = setInterval(() => {
          const { callStartTime } = get();
          if (callStartTime) {
            const duration = Math.floor((Date.now() - callStartTime.getTime()) / 1000);
            set({ callDuration: duration });
          }
        }, 1000);
      },
      
      stopCallTimer: () => {
        if (callTimerInterval) {
          clearInterval(callTimerInterval);
          callTimerInterval = null;
        }
      },
      
      resetCall: () => {
        set({
          caller: null,
          callee: null,
          currentCallUser: null,
          localStream: null,
          remoteStream: null,
          peerConnection: null,
          callStartTime: null,
          callDuration: 0,
          error: null,
          isCallModalOpen: false,
          isVideo: false,
          isVideoEnabled: true,
          isAudioEnabled: true,
          isMicMuted: false,
          isCameraOff: false,
        });
      },
      
      getUserMedia: async (video, audio) => {
        const constraints = {
          video: video ? {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          } : false,
          audio: audio ? {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } : false
        };
        
        try {
          return await navigator.mediaDevices.getUserMedia(constraints);
        } catch (error) {
          console.error('Error accessing media devices:', error);
          throw new Error('Unable to access camera/microphone');
        }
      },
      
      setupPeerConnection: () => {
        const configuration = {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ]
        };
        
        const pc = new RTCPeerConnection(configuration);
        
        // Handle remote stream
        pc.ontrack = (event) => {
          const [remoteStream] = event.streams;
          get().setRemoteStream(remoteStream);
        };
        
        // Handle connection state changes
        pc.onconnectionstatechange = () => {
          console.log('Connection state:', pc.connectionState);
          
          if (pc.connectionState === 'connected') {
            set({ status: 'connected' });
          } else if (pc.connectionState === 'failed') {
            set({ 
              status: 'failed',
              error: 'Connection failed'
            });
          } else if (pc.connectionState === 'disconnected') {
            get().endCall();
          }
        };
        
        // Handle ICE connection state
        pc.oniceconnectionstatechange = () => {
          console.log('ICE connection state:', pc.iceConnectionState);
          
          if (pc.iceConnectionState === 'failed') {
            set({ 
              status: 'failed',
              error: 'Network connection failed'
            });
          }
        };
        
        return pc;
      },
    }),
    { name: 'CallStore' }
  )
);

// Selectors
export const useCallStatus = () => useCallStore((state) => state.status);
export const useIsInCall = () => useCallStore((state) => state.isInCall);
export const useCurrentCallUser = () => useCallStore((state) => state.currentCallUser);
export const useLocalStream = () => useCallStore((state) => state.localStream);
export const useRemoteStream = () => useCallStore((state) => state.remoteStream);
export const useCallDuration = () => useCallStore((state) => state.callDuration);
export const useCallError = () => useCallStore((state) => state.error);
export const useIsCallModalOpen = () => useCallStore((state) => state.isCallModalOpen);

// Media controls selectors
export const useMediaControls = () => useCallStore((state) => ({
  isVideoEnabled: state.isVideoEnabled,
  isAudioEnabled: state.isAudioEnabled,
  isMicMuted: state.isMicMuted,
  isCameraOff: state.isCameraOff,
  toggleVideo: state.toggleVideo,
  toggleAudio: state.toggleAudio,
  toggleMic: state.toggleMic,
  toggleCamera: state.toggleCamera,
}));

// Actions selectors
export const useCallActions = () => useCallStore((state) => ({
  initiateCall: state.initiateCall,
  acceptCall: state.acceptCall,
  rejectCall: state.rejectCall,
  endCall: state.endCall,
  setCallModalOpen: state.setCallModalOpen,
  createOffer: state.createOffer,
  createAnswer: state.createAnswer,
  setRemoteDescription: state.setRemoteDescription,
  addIceCandidate: state.addIceCandidate,
}));