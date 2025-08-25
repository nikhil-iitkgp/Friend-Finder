"use client";

import { useEffect, useRef, useState } from 'react';
import { useCallStore, useUser } from '@/store';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Phone, 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function CallModal() {
  const {
    isCallModalOpen,
    callStatus,
    currentCallUser,
    localStream,
    remoteStream,
    isVideo,
    isMuted,
    isVideoOff,
    isSpeakerOn,
    callDuration,
    endCall,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    acceptCall,
    rejectCall,
  } = useCallStore();

  const user = useUser();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Set up video streams
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    endCall();
  };

  const handleAcceptCall = () => {
    acceptCall();
  };

  const handleRejectCall = () => {
    rejectCall();
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (!isCallModalOpen || !currentCallUser) {
    return null;
  }

  const isIncoming = callStatus === 'incoming';
  const isConnected = callStatus === 'connected';
  const isConnecting = callStatus === 'connecting';

  return (
    <Dialog open={isCallModalOpen}>
      <DialogContent 
        className={cn(
          "p-0 border-0 bg-gradient-to-br from-slate-900 to-slate-800 text-white",
          isFullscreen ? "w-screen h-screen max-w-none" : "max-w-2xl"
        )}
        hideCloseButton
      >
        <div className="relative h-full min-h-[500px] flex flex-col">
          {/* Video Container */}
          {isVideo && (
            <div className="flex-1 relative bg-black rounded-t-lg overflow-hidden">
              {/* Remote Video */}
              {remoteStream && isConnected ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900">
                  <div className="text-center">
                    <Avatar className="h-24 w-24 mx-auto mb-4">
                      <AvatarImage src={currentCallUser.profilePicture} alt={currentCallUser.username} />
                      <AvatarFallback className="text-2xl">
                        {currentCallUser.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-white/80">
                      {isConnecting ? 'Connecting...' : 
                       isIncoming ? 'Incoming video call' : 
                       'Waiting for response...'}
                    </p>
                  </div>
                </div>
              )}

              {/* Local Video */}
              {localStream && (
                <div className="absolute top-4 right-4 w-32 h-24 bg-black rounded-lg overflow-hidden border-2 border-white/20">
                  {!isVideoOff ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-700">
                      <VideoOff className="h-6 w-6 text-white/60" />
                    </div>
                  )}
                </div>
              )}

              {/* Fullscreen Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 left-4 bg-black/20 hover:bg-black/40 text-white"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          )}

          {/* Audio Call UI */}
          {!isVideo && (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900 rounded-t-lg">
              <div className="text-center">
                <Avatar className="h-32 w-32 mx-auto mb-6">
                  <AvatarImage src={currentCallUser.profilePicture} alt={currentCallUser.username} />
                  <AvatarFallback className="text-4xl">
                    {currentCallUser.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-2xl font-semibold mb-2">{currentCallUser.username}</h2>
                <p className="text-white/80 mb-4">
                  {isConnecting ? 'Connecting...' : 
                   isIncoming ? 'Incoming voice call' : 
                   isConnected ? 'Voice call in progress' :
                   'Calling...'}
                </p>
                {isConnected && callDuration > 0 && (
                  <p className="text-lg font-mono text-green-400">
                    {formatDuration(callDuration)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Call Controls */}
          <div className="p-6 bg-slate-800/90 backdrop-blur-sm rounded-b-lg">
            {isIncoming ? (
              /* Incoming Call Controls */
              <div className="flex items-center justify-center space-x-8">
                <Button
                  onClick={handleRejectCall}
                  size="lg"
                  className="bg-red-500 hover:bg-red-600 text-white rounded-full w-16 h-16"
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
                <Button
                  onClick={handleAcceptCall}
                  size="lg"
                  className="bg-green-500 hover:bg-green-600 text-white rounded-full w-16 h-16"
                >
                  <Phone className="h-6 w-6" />
                </Button>
              </div>
            ) : (
              /* Active Call Controls */
              <div className="flex items-center justify-center space-x-4">
                <Button
                  onClick={toggleMute}
                  variant="ghost"
                  size="lg"
                  className={cn(
                    "rounded-full w-12 h-12",
                    isMuted ? "bg-red-500/20 text-red-400" : "bg-white/20 text-white"
                  )}
                >
                  {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>

                {isVideo && (
                  <Button
                    onClick={toggleVideo}
                    variant="ghost"
                    size="lg"
                    className={cn(
                      "rounded-full w-12 h-12",
                      isVideoOff ? "bg-red-500/20 text-red-400" : "bg-white/20 text-white"
                    )}
                  >
                    {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                  </Button>
                )}

                <Button
                  onClick={toggleSpeaker}
                  variant="ghost"
                  size="lg"
                  className={cn(
                    "rounded-full w-12 h-12",
                    isSpeakerOn ? "bg-blue-500/20 text-blue-400" : "bg-white/20 text-white"
                  )}
                >
                  {isSpeakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                </Button>

                <Button
                  onClick={handleEndCall}
                  size="lg"
                  className="bg-red-500 hover:bg-red-600 text-white rounded-full w-14 h-14"
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
              </div>
            )}

            {/* Call Status */}
            {isConnected && callDuration > 0 && (
              <div className="text-center mt-4">
                <p className="text-sm text-white/60">
                  Call duration: {formatDuration(callDuration)}
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}