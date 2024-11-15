import { useEffect, useState } from "react";
import { Text, View, TextInput, Alert, TouchableOpacity } from "react-native";
import axios from "axios";
import { useDispatch } from "react-redux";
import { setToken, setUserId } from "../store/authSlice"; // Adjust the path to your slice
import { router } from "expo-router";

export default function Index() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const dispatch = useDispatch();

  const handleLogin = async () => {
    try {
      const response = await axios.post("http://krowdz.net/api/auth", {
        username: email,
        password,
      });

      const { access_token } = response.data;

      if (access_token) {
        // Dispatch token to Redux store
        dispatch(setToken(access_token));

        // Optionally, set the token globally for axios requests (for all future API calls)
        axios.defaults.headers['Authorization'] = `Bearer ${access_token}`;

        // Fetch the user ID from the API
        const userResponse = await axios.get("http://krowdz.net/api/auth?include=communityUser.manageablePages.avatar,communityUser.manageablePages.cover,activeUser.avatar,activeUser.cover,communityUser.avatar,communityUser.cover,communities,role,language,settings", {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        const userId = userResponse.data.users[0].id;
        if (userId) {
          // Dispatch user ID to Redux store
          dispatch(setUserId(userId));
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

  useEffect(() => {
    // Optionally, redirect user if token exists in Redux store (e.g., check during app load)
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
    </View>
  );
}
