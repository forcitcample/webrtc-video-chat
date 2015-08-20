"use strict"

var localPeerConnection, signallingServer;

var btnSend = document.getElementById('btn-send');
var btnVideoStop = document.getElementById('btn-video-stop');
var btnVideoStart = document.getElementById('btn-video-start');
var btnVideoJoin = document.getElementById('btn-video-join');
var localVideo = document.getElementById('local-video');
var localStream;

var divLocalVideo = document.getElementById('local-video');
var divRemoteVideo = document.getElementById('remote-video');

btnVideoStop.onclick = function(){
    if(localStream != null){
        localStream.stop();
    }
}
btnVideoStart.onclick = function(){
    // initiate/offering a call
    createConnection(true);
}

btnVideoJoin.onclick = function(){
    // just joining a call, not offering
    createConnection(false);
}

// WEBRTC STUFF STARTS HERE
// Set objects as most are currently prefixed
window.RTCPeerConnection        = window.RTCPeerConnection || window.mozRTCPeerConnection || 
                                    window.webkitRTCPeerConnection || window.msRTCPeerConnection;
window.RTCSessionDescription    = window.RTCSessionDescription || window.mozRTCSessionDescription ||
                                    window.webkitRTCSessionDescription || window.msRTCSessionDescription;
navigator.getUserMedia          = navigator.getUserMedia || navigator.mozGetUserMedia ||
                                    navigator.webkitGetUserMedia || navigator.msGetUserMedia;
window.SignallingServer         = window.SignallingServer;
// RTCPeerConnection Options
var server = {
    // User Google's STUN server
    iceServers: [{"url": "stun:stun.l.google.com:19302"}]
};

var sdpConstraints = {
    optional: [],
    mandatory: {
        OfferToReceiveVideo: true,
    }
}

function createConnection(localIsCaller){
    // create peer connection
    localPeerConnection = new RTCPeerConnection(server);


    // create signalling server
    signallingServer = new SignallingServer("chat", "http://localhost:2013");
    signallingServer.connect();


    // a remote peer has joined room, initiate sdp exchange
    signallingServer.onGuestJoined = function(){
        trace('guest joined!')
        // set local description and send to remote
        localPeerConnection.createOffer(function(sessionDescription){
            trace('set local session desc with offer');

            localPeerConnection.setLocalDescription(sessionDescription);
            
            //!!! send local sdp to remote
            signallingServer.sendSDP(sessionDescription);
        });
    }

    // got sdp from remote
    signallingServer.onReceiveSdp = function(sdp){
        // if local was the caller, set remote desc
        if(localIsCaller){
            trace('is caller');
            trace('set remote session desc with answer');
            localPeerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
        }
        // if local is joining a call, set remote sdp and create answer
        else{
            trace('set remote session desc with offer');
            localPeerConnection.setRemoteDescription(new RTCSessionDescription(sdp), function(){
                trace('make answer');
                localPeerConnection.createAnswer(function(sessionDescription){
                    // set local description
                    trace('set local session desc with answer');
                    localPeerConnection.setLocalDescription(sessionDescription);

                    //!!! send local sdp to remote too
                    signallingServer.sendSDP(sessionDescription);
                });
            });
        }
    }

    // get ice candidates and send them over
    // wont get called unless SDP has been exchanged
    localPeerConnection.onicecandidate = function(event){
        if(event.candidate){
            //!!! send ice candidate over via signalling channel
            //trace(event.candidate.candidate)
        }
    }

    // when stream is added to connection, put it in video src
    localPeerConnection.onaddstream = function(data){
        var video = document.createElement("video");
        video.src = URL.createObjectURL(data.stream);
        divRemoteVideo.appendChild(video);
    }
    
    // create local data channel, send it to remote
    navigator.getUserMedia({ video: true }, function(stream){
        // add local stream
        localPeerConnection.addStream(stream);
        localStream = stream;

        // show local video
        localVideo.src = window.URL.createObjectURL(stream);

    }, errorHandler)
}

function errorHandler(error){
    console.error('Something went wrong!');
    console.error(error);
}

function trace(text){
    console.info(text);
}
