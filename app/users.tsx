import React, { useState, useEffect } from 'react';
import { View, Text, Alert, FlatList, StyleSheet, Image, TouchableOpacity, Platform, PermissionsAndroid } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, RTCView, mediaDevices } from 'react-native-webrtc';

// Connect to the signaling server
const socket = io('http://localhost:3000', { transports: ['websocket'] });

const Users = () => {
  const [users, setUsers] = useState([]);
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
    socket.on('incomingCall', (data) => {
      const { signalData, callerId } = data;
      console.log('Incoming call from:', callerId);
      setIncomingCall({ signalData, callerId });

      Alert.alert(
        'Incoming Call',
        `You are receiving a call from User ${callerId}`,
        [
          { text: 'Reject', onPress: () => rejectCall(callerId) },
          { text: 'Accept', onPress: () => acceptCall(signalData, callerId) },
        ]
      );
    });

    return () => {
      socket.off('incomingCall');
    };
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
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
      const token = await AsyncStorage.getItem('access_token');
      const userId = await AsyncStorage.getItem('user_id');

      if (!userId || !token) {
        throw new Error("User not authenticated.");
      }

      socket.emit('registerUser', { userId });
      console.log(`User registered with ID: ${userId}`);
    } catch (error) {
      console.error("Error registering user:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error("No token found");

      const response = await axios.get('http://localhost:8082/api/users/search?search=&include=avatar', {
        headers: { Authorization: `Bearer ${token}` },
      });
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
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    };
    const pc = new RTCPeerConnection(configuration);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('iceCandidate', { candidate: event.candidate });
      }
    };

    pc.onaddstream = (event) => {
      setRemoteStream(event.stream);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected') {
        Alert.alert("Call Ended", "The other user has disconnected.");
        setIncomingCall(null);
      }
    };

    setPeerConnection(pc);
    return pc;
  };

  const handleUserPress = async (user) => {
    console.log('User pressed:', user.id);
    Alert.alert("Initiating Call", `Calling ${user.name.full}`);

    const pc = initializePeerConnection();
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('callUser', { userId: user.id, signalData: offer });
    } catch (error) {
      console.error("Error creating offer:", error);
    }
  };

  const acceptCall = async (signalData, callerId) => {
    const pc = initializePeerConnection();
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(signalData));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('answerCall', { signalData: answer, callerId });
      setIncomingCall(null);
    } catch (error) {
      console.error("Error accepting call:", error);
    }
  };

  const rejectCall = (callerId) => {
    console.log('Call rejected');
    socket.emit('reject', { callerId });
    setIncomingCall(null);
  };

  if (loading) return <Text>Loading...</Text>;
  if (error) return <Text>{error}</Text>;

  return (
    <View style={styles.container}>
      <Text>Users List:</Text>
      {users.length === 0 ? (
        <Text>No users found</Text>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.item}>
              {item._type === 'User' ? (
                <>
                  {item.avatar ? (
                    <Image
                      source={{ uri: `https://www.krowdz.net${item.avatar.links.source.url}` }}
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
        <RTCView
          style={styles.remoteVideo}
          streamURL={remoteStream.toURL()}
        />
      )}

      {/* Incoming Call UI */}
      {incomingCall && (
        <View style={styles.callBox}>
          <Text>Incoming Call from User {incomingCall.callerId}</Text>
          <TouchableOpacity onPress={() => acceptCall(incomingCall.signalData, incomingCall.callerId)}>
            <Text>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => rejectCall(incomingCall.callerId)}>
            <Text>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  item: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    flexDirection: 'row',
    alignItems: 'center',
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
    position: 'absolute',
    bottom: 20,
    right: 20,
    borderRadius: 10,
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
  },
  callBox: {
    position: 'absolute',
    top: 50,
    left: 50,
    right: 50,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
  },
});

export default Users;
