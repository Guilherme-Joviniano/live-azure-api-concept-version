import firebase from 'firebase/app';
import 'firebase/firestore';


const firebaseConfig = {
  apiKey: "AIzaSyB-5AQuNAyFOkiswfOfdsVPQQmK1lGdPrE",
  authDomain: "live-streaming-caa97.firebaseapp.com",
  projectId: "live-streaming-caa97",
  storageBucket: "live-streaming-caa97.appspot.com",
  messagingSenderId: "584327862946",
  appId: "1:584327862946:web:07b77f791c6e3d8fe855fb",
  measurementId: "G-ZZFE0N8W8Y"
};


let app = null

if(!firebase.apps.length) {
    app = firebase.initializeApp(firebaseConfig)
}

const firestore = firebase.firestore();

const servers = {
    iceServers: [
        {
            urls: ['stun:stun1.1.google.com.19302', 'stun:stun2.1.google.com.19302']
        }
    ],
    iceCandidatePoolSize: 10
}

// Global State 
let pc = new RTCPeerConnection(servers);

let localStreamer = null;
let remoteStream = null
const webcamButton = document.querySelector("#webcamButton")
const webcamVideo = document.querySelector("#liveVideo")
const remoteVideo = document.querySelector("#remoteVideo")
console.log(remoteVideo);
const callButton = document.querySelector("#callButton")

webcamButton.onclick = async () => {
    localStreamer = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
    })
    
    localStreamer.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamer)
    })

    
    webcamVideo.srcObject = localStreamer
}

callButton.onclick = async () => {
    const callDoc = firestore.collection("calls").doc()
    
    const offerCandidates = callDoc.collection("offerCandidates")
    const answerCanditates = callDoc.collection("answerCandidates")

    document.querySelector("#callInput").value = callDoc.id
    
    // Get candidates for caller, save to db
    pc.onicecandidate = event => {
        event.candidate && offerCandidates.add(event.candidate.toJSON());
    }

    // Create Offer 
    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription)

    const offer = {
        sdp: offerDescription.sdp,
        type: offerDescription.type
    }

    await callDoc.set({
        offer
    })

    callDoc.onSnapshot((snapshot) => {
        const data = snapshot.data()
        if(!pc.currentRemoteDescription && data?.answer) {
            const answerDescription = new RTCSessionDescription(data.answer)
            pc.setRemoteDescription(answerDescription)
        }
    })

    // When answered
    answerCanditates.onSnapshot(snapshot => {
        snapshot.docChanges().forEach((change) => {
            if(change.type === "added") {
                const cadidate = new RTCIceCandidate(change.doc.data())
                pc.addIceCandidate(cadidate);
            }
        })
    })
}

document.querySelector("#answerButton").onclick = async () => {
    const callId = document.querySelector("#callInput").value
    const callDoc = firestore.collection("calls").doc(callId)

    const offerCandidates = callDoc.collection("offerCandidates")
    const answerCanditates = callDoc.collection("answerCandidates")

    pc.onicecandidate = event => {
        event.candidate && answerCanditates.add(event.cadidate.toJSON())
    }

    const callData = (await callDoc.get()).data()

    console.log(callData.offer)
    
    const offerDescription = callData.offer
    
    await pc.setRemoteDescription(new RTCSessionDescription(offerDescription))

    const answerDescription = await pc.createAnswer()
    await pc.setLocalDescription(answerDescription)
    
    const answer = {
        type: answerDescription.type,
        sdp: answerDescription.sdp
    }

    await callDoc.update({
        answer
    })

    offerCandidates.onSnapshot(snapshot => {
        snapshot.docChanges().forEach((change) => {
            console.log(change);
            if (change.type === 'added') {
                let data = change.doc.data()
                pc.addIceCandidate(new RTCIceCandidate(data))
            }
        })
    })
}


remoteStream = new MediaStream();

pc.ontrack = event => {
    event.streams[0].getTracks().forEach(track => {
        remoteStream.addTrack(track);
    });
};

remoteVideo.srcObject = remoteStream;











