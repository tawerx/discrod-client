import "./App.css";
import React from "react";
import { socket } from "./socket";
const configuration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const App = () => {
  const localStream = React.useRef(null);
  const localAudioRef = React.useRef(null);
  const remoteAudioRef = React.useRef(null);
  const peerConnection = React.useRef(null);
  const role = React.useRef(null);

  const makeCall = async () => {
    role.current = "caller";
    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);
    socket.emit("sendOffer", offer);
  };

  React.useEffect(() => {
    role.current = "user";
    peerConnection.current = new RTCPeerConnection(configuration);
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        localStream.current = stream;
        if (localAudioRef.current) {
          localAudioRef.current.srcObject = stream;
        }
      })
      .catch((error) => {
        console.error("Error accessing media devices.", error);
      });

    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, localStream.current);
      });
    }

    peerConnection.current.addEventListener("icecandidate", (event) => {
      if (event.candidate) {
        socket.emit("sendICE", event.candidate);
      }
    });

    peerConnection.current.addEventListener(
      "connectionstatechange",
      (event) => {
        if (peerConnection.connectionState === "connected") {
          console.log("connected");
        }
      }
    );

    peerConnection.current.addEventListener("track", async (event) => {
      if (remoteAudioRef.current) {
        const [remoteStream] = event.streams;
        remoteAudioRef.current.srcObject = remoteStream;
      }
    });

    socket.on("getOffer", async (offer) => {
      if (role.current == "user") {
        await peerConnection.current.setRemoteDescription(offer);
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        socket.emit("sendAnswer", answer);
      }
    });

    socket.on("getAnswer", async (answer) => {
      if (role.current == "caller") {
        await peerConnection.current.setRemoteDescription(answer);
      }
    });

    socket.on("getICE", async (candidate) => {
      await peerConnection.current.addIceCandidate(candidate);
    });

    return () => {
      peerConnection.current.removeEventListener("icecandidate", (event) => {
        if (event.candidate) {
          socket.emit("sendICE", event.candidate);
        }
      });

      peerConnection.current.removeEventListener(
        "connectionstatechange",
        (event) => {
          if (peerConnection.connectionState === "connected") {
            console.log("connected");
          }
        }
      );
    };
  }, []);
  return (
    <div>
      <audio
        id="localAudio"
        ref={localAudioRef}
        autoPlay
        playsInline
        controls="false"
      />
      <audio
        id="remoteAudio"
        ref={remoteAudioRef}
        autoPlay
        playsInline
        controls="false"
      />
      <button onClick={makeCall}>Начать</button>
      <button onClick={() => console.log(peerConnection.current)}>
        peerConnection
      </button>
    </div>
  );
};

export default App;
