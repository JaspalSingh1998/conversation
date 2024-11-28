import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Alert,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  Platform,
  PermissionsAndroid,
  SafeAreaView,
  TextInput,
} from "react-native";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import io from "socket.io-client";
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  RTCView,
  mediaDevices,
} from "react-native-webrtc";
import Icon from 'react-native-vector-icons/Ionicons';

// Connect to the signaling server
const socket = io("http://3.133.176.196:5050", { transports: ["websocket"] });

const Users = () => {
  const dispatch = useDispatch();
  const { access_token, user_id } = useSelector((state) => state.auth); // Assuming auth contains access_token and user_id in the Redux store
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  useEffect(() => {
    registerUser();
    fetchUsers();
    requestPermissions(); // Request permissions for camera and microphone
    socket.on("incomingCall", (data) => {
      const { signalData, callerId } = data;
      console.log("Incoming call from:", callerId);
      setIncomingCall({ signalData, callerId });

      // Alert.alert(
      //   "Incoming Call",
      //   `You are receiving a call from User ${callerId}`,
      //   [
      //     { text: "Reject", onPress: () => rejectCall(callerId) },
      //     { text: "Accept", onPress: () => acceptCall(signalData, callerId) },
      //   ]
      // );
    });

    return () => {
      socket.off("incomingCall");
    };
  }, []);

  const searchUsers = async (search) => {
    try {
      setLoading(true);
      if (!access_token) throw new Error("No token found");

      const response = await axios.get(
        `https://krowdz.net/api/conversations/search?search=${search}`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
          },
        }
      );
      setUsers(response.data.data[0]?.users || []);
    } catch (error) {
      console.error(error);
      setError("Failed to search users. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text) => {
    setSearchTerm(text);
    if (text.trim().length > 0) {
      searchUsers(text);
    } else {
      fetchUsers();
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
    fetchUsers();
  };

  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      try {
        const cameraPermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA
        );
        const audioPermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        if (
          cameraPermission === PermissionsAndroid.RESULTS.GRANTED &&
          audioPermission === PermissionsAndroid.RESULTS.GRANTED
        ) {
          console.log("Camera and audio permissions granted");
          startLocalStream(); // Start the stream if permissions are granted
        } else {
          console.log("Camera or audio permissions denied");
        }
      } catch (err) {
        console.error("Permission error:", err);
      }
    } else {
      startLocalStream(); // iOS handles permissions via Info.plist
    }
  };

  const startLocalStream = async () => {
    try {
      // Request both audio and video streams
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setLocalStream(stream);
    } catch (error) {
      console.error("Error starting local stream:", error);
    }
  };

  const registerUser = async () => {
    try {
      if (!user_id || !access_token) {
        throw new Error("User not authenticated.");
      }

      socket.emit("registerUser", { userId: user_id });
      console.log(`User registered with ID: ${user_id}`);
    } catch (error) {
      console.error("Error registering user:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      if (!access_token) throw new Error("No token found");

      const response = await axios.get(
        "https://krowdz.net/api/users/search?search=&include=avatar",
        {
          headers: { Authorization: `Bearer ${access_token}` },
        }
      );
      setUsers(response.data.data);
    } catch (error) {
      console.error(error);
      setError("Failed to fetch users. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const initializePeerConnection = () => {
    const configuration = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    };
    const pc = new RTCPeerConnection(configuration);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("iceCandidate", { candidate: event.candidate });
      }
    };

    pc.onaddstream = (event) => {
      setRemoteStream(event.stream);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected") {
        Alert.alert("Call Ended", "The other user has disconnected.");
        setIncomingCall(null);
      }
    };

    setPeerConnection(pc);
    return pc;
  };

  const handleUserPress = async (user) => {
    console.log("User pressed:", user.id);
    Alert.alert("Initiating Call", `Calling ${user.name.full}`);

    const pc = initializePeerConnection();
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("callUser", { userId: user.id, signalData: offer });
    } catch (error) {
      console.error("Error creating offer:", error);
    }
  };

  const acceptCall = async (signalData, callerId) => {
    const pc = initializePeerConnection();
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(signalData));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("answerCall", { signalData: answer, callerId });
      setIncomingCall(null);
    } catch (error) {
      console.error("Error accepting call:", error);
    }
  };

  const rejectCall = (callerId) => {
    console.log("Call rejected");
    socket.emit("reject", { callerId });
    setIncomingCall(null);
  };

  if (loading) return <Text>Loading...</Text>;
  if (error) return <Text>{error}</Text>;

  return (
    <SafeAreaView style={styles.container}>
      <Text>Users List:</Text>
      {users.length === 0 ? (
        <Text>No users found</Text>
      ) : (
        <>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchBar}
              placeholder="Search Users"
              value={searchTerm}
              onChangeText={handleSearch}
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={clearSearch}
              >
                <Icon name="close-circle" size={20} color="#ccc" />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={users}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.item}>
                {item._type === "User" ? (
                  <>
                    {item.avatar ? (
                      <Image
                        source={{
                          uri: `https://www.krowdz.net${item.avatar.links.source.url}`,
                        }}
                        style={styles.avatar}
                      />
                    ) : (
                      <Text>No Avatar</Text>
                    )}
                    <TouchableOpacity onPress={() => handleUserPress(item)}>
                      <Text>{item.name.full}</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <Text>{item.title}</Text>
                )}
              </View>
            )}
          />
        </>
      )}

      {/* Display local video */}
      {localStream && (
        <RTCView
          style={styles.localVideo}
          streamURL={localStream.toURL()}
          mirror={true}
        />
      )}

      {/* Display remote video */}
      {remoteStream && (
        <RTCView style={styles.remoteVideo} streamURL={remoteStream.toURL()} />
      )}

      {/* Incoming Call UI */}
      {incomingCall && (
        <View style={styles.callBox}>
          <Text>Incoming Call from User {incomingCall.callerId}</Text>
          <TouchableOpacity
            onPress={() =>
              acceptCall(incomingCall.signalData, incomingCall.callerId)
            }
          >
            <Text>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => rejectCall(incomingCall.callerId)}>
            <Text>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  searchBar: { 
    flex: 1, 
    height: 40, 
    borderColor: '#ccc', 
    borderWidth: 1, 
    borderRadius: 5, 
    paddingHorizontal: 10, 
    backgroundColor: '#fff' 
  },
  clearButton: { 
    marginLeft: -30, 
    padding: 5 
  },
  item: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  localVideo: {
    width: 100,
    height: 150,
    position: "absolute",
    bottom: 20,
    right: 20,
    borderRadius: 10,
  },
  remoteVideo: {
    width: "100%",
    height: "100%",
  },
  callBox: {
    position: "absolute",
    top: 50,
    left: 50,
    right: 50,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
  },
});

export default Users;
