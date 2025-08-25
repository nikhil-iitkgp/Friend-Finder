"use client";

import { useRef, useCallback, useEffect } from 'react';
import { useSocket } from './useSocket';
import { useCallStore } from '@/store';

interface UseWebRTCOptions {
  onLocalStream?: (stream: MediaStream) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onCallEnd?: () => void;
}

export function useWebRTC(options: UseWebRTCOptions = {}) {
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  
  const { socket } = useSocket();
  const { 
    setLocalStream, 
    setRemoteStream, 
    setCallStatus,
    endCall 
  } = useCallStore();

  // ICE servers configuration
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  // Initialize peer connection
  const initializePeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    const pc = new RTCPeerConnection({ iceServers });

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('call_ice_candidate', {
          to: '', // Will be set by the caller
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      remoteStreamRef.current = remoteStream;
      setRemoteStream(remoteStream);
      options.onRemoteStream?.(remoteStream);
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      
      switch (pc.connectionState) {
        case 'connected':
          setCallStatus('connected');
          break;
        case 'disconnected':
        case 'failed':
        case 'closed':
          handleCallEnd();
          break;
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [socket, setRemoteStream, setCallStatus, options]);

  // Get user media
  const getUserMedia = useCallback(async (constraints: MediaStreamConstraints) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);
      options.onLocalStream?.(stream);
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }, [setLocalStream, options]);

  // Start call (caller)
  const startCall = useCallback(async (peerId: string, isVideo = false) => {
    try {
      setCallStatus('connecting');
      
      // Get user media
      const stream = await getUserMedia({
        video: isVideo,
        audio: true,
      });

      // Initialize peer connection
      const pc = initializePeerConnection();

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (socket) {
        socket.emit('call_offer', {
          to: peerId,
          offer: offer.toJSON(),
        });
      }

    } catch (error) {
      console.error('Error starting call:', error);
      setCallStatus('error');
    }
  }, [getUserMedia, initializePeerConnection, socket, setCallStatus]);

  // Answer call (callee)
  const answerCall = useCallback(async (offer: RTCSessionDescriptionInit, isVideo = false) => {
    try {
      setCallStatus('connecting');

      // Get user media
      const stream = await getUserMedia({
        video: isVideo,
        audio: true,
      });

      // Initialize peer connection
      const pc = initializePeerConnection();

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Set remote description (offer)
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Create and send answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (socket) {
        socket.emit('call_answer', {
          to: '', // Will be set by the caller context
          answer: answer.toJSON(),
        });
      }

    } catch (error) {
      console.error('Error answering call:', error);
      setCallStatus('error');
    }
  }, [getUserMedia, initializePeerConnection, socket, setCallStatus]);

  // Handle call end
  const handleCallEnd = useCallback(() => {
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Clear remote stream
    remoteStreamRef.current = null;

    setLocalStream(null);
    setRemoteStream(null);
    endCall();
    options.onCallEnd?.();
  }, [setLocalStream, setRemoteStream, endCall, options]);

  // Handle incoming answer
  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    try {
      const pc = peerConnectionRef.current;
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }, []);

  // Handle ICE candidate
  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    try {
      const pc = peerConnectionRef.current;
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return !videoTrack.enabled; // Return new muted state
      }
    }
    return false;
  }, []);

  // Toggle audio (mute)
  const toggleAudio = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return !audioTrack.enabled; // Return new muted state
      }
    }
    return false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      handleCallEnd();
    };
  }, [handleCallEnd]);

  return {
    startCall,
    answerCall,
    handleCallEnd,
    handleAnswer,
    handleIceCandidate,
    toggleVideo,
    toggleAudio,
    localStream: localStreamRef.current,
    remoteStream: remoteStreamRef.current,
    peerConnection: peerConnectionRef.current,
  };
}