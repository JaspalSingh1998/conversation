import { useEffect, useState } from "react";
import { Text, View, TextInput, Alert, TouchableOpacity } from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage"; // Import AsyncStorage
import { router } from "expo-router";

export default function Index() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const response = await axios.post("http://localhost:8082/api/auth", {
        username: email,
        password,
      });

      const { access_token } = response.data;

      if (access_token) {
        // Store token securely using AsyncStorage
        await AsyncStorage.setItem("access_token", access_token);

        // Optionally, set the token globally for axios requests (for all future API calls)
        axios.defaults.headers['Authorization'] = `Bearer ${access_token}`;

        // Handle success
        console.log("Token stored successfully:", access_token);

        // Fetch the user ID from the API
        const userResponse = await axios.get("http://localhost:8082/api/auth?include=communityUser.manageablePages.avatar,communityUser.manageablePages.cover,activeUser.avatar,activeUser.cover,communityUser.avatar,communityUser.cover,communities,role,language,settings", {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        console.log('AccountID:', userResponse.data.id);
        console.log('UserID:', userResponse.data.users[0].id);
        const userId = userResponse.data.users[0].id; // Assuming the user ID is in the response
        if (userId) {
          // Store the user ID securely
          await AsyncStorage.setItem("user_id", userId);
          console.log("User ID stored successfully:", userId);
        }

        Alert.alert("Login Successful", "You have logged in successfully.");
        router.push("/users");
      }
    } catch (error) {
      // Handle error
      console.error(error);
      Alert.alert("Login Failed", "Invalid credentials. Please try again.");
    }
  };

  // Example function to retrieve the token when needed
  const getToken = async () => {
    try {
      const token = await AsyncStorage.getItem("access_token");
      if (token) {
        console.log("Retrieved token:", token);
      } else {
        console.log("No token found");
      }
    } catch (error) {
      console.error("Error retrieving token:", error);
    }
  };

  const redirectToUsers = async () => {
    const token = await AsyncStorage.getItem("access_token");
    if (token) {
      router.push("/users");
      console.log("Retrieved token:", token);
    }
  };

  useEffect(() => {
      redirectToUsers();
  }, []);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 20,
        backgroundColor: "#f9f9f9",
      }}
    >
      <TextInput
        style={{
          width: "100%",
          padding: 12,
          marginBottom: 15,
          borderColor: "#ccc",
          borderWidth: 1,
          borderRadius: 8,
          backgroundColor: "#fff",
          fontSize: 16,
        }}
        placeholder="Email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={{
          width: "100%",
          padding: 12,
          marginBottom: 20,
          borderColor: "#ccc",
          borderWidth: 1,
          borderRadius: 8,
          backgroundColor: "#fff",
          fontSize: 16,
        }}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity
        style={{
          backgroundColor: "#4CAF50",
          paddingVertical: 12,
          width: "100%",
          borderRadius: 8,
          alignItems: "center",
          justifyContent: "center",
        }}
        onPress={handleLogin}
      >
        <Text style={{ color: "#fff", fontSize: 18 }}>Login</Text>
      </TouchableOpacity>

      {/* You can use this to test token retrieval */}
      <TouchableOpacity
        style={{
          backgroundColor: "#FF5722",
          paddingVertical: 12,
          width: "100%",
          borderRadius: 8,
          alignItems: "center",
          justifyContent: "center",
          marginTop: 20,
        }}
        onPress={getToken}
      >
        <Text style={{ color: "#fff", fontSize: 18 }}>Get Token</Text>
      </TouchableOpacity>
    </View>
  );
}
