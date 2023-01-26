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

let remoteStream = null


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
