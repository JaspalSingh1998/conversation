import { useEffect, useState } from "react";
import { Text, View, TextInput, Alert, TouchableOpacity } from "react-native";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { setToken, setUserId } from "../store/authSlice"; // Adjust the path to your slice
import { router } from "expo-router";


export default function Index() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const dispatch = useDispatch();
  const handleLogin = async () => {
    try {
      const response = await axios.post("https://krowdz.net/api/auth", {
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
        const userResponse = await axios.get("https://krowdz.net/api/auth?include=communityUser.manageablePages.avatar,communityUser.manageablePages.cover,activeUser.avatar,activeUser.cover,communityUser.avatar,communityUser.cover,communities,role,language,settings", {
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
      // const access_token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIyIiwianRpIjoiZmYyNjg4NzJkNzg0NzJjNjZjYjc5ODhmMWJkYTVlNjk1MjNmZTM2OWQxM2YxMzc0YjcyMTE4ZDRjMDE2NzNlZTEyODYwNTE2ZTE2OWViNjkiLCJpYXQiOjE3MzI4MDU5NzcuMTgzNDE3LCJuYmYiOjE3MzI4MDU5NzcuMTgzNDE5LCJleHAiOjE3NjQzNDE5NzcuMTcwOTY2LCJzdWIiOiIyIiwic2NvcGVzIjpbXX0.fjOz6K96Q4b2QUPIdfqoRlcNIb_4EGj-KadW0RxEPmQf5od4V42_qKTAgMMFzmDao5Ds0swxmy2eS5384Rcko99uo9ohJX50l_CBNM0CV710nbzC7v5zoP3TW3koHVzf7P3TZLONvAXPqYqixSQd3jTB1AmmwHlUhxP90ckeAW7aD66z8iasCYAR2guudfVbUgribV_L_2qenI5CP5-uJz3xD0wIaoakVhBG2rexnXLNOIgxoD8t4o1ShKRnV4hK4EbkqedIcLm2fkguifL32vv8sn8vGrqGF4vRjClvCgSd14vr-CrsiSUP5U41vXm5Hz2HOD9icbl_riS28IL8ZA9Ml_a4Te98MM8n6SVBkAHYT52pqXNVSCgB6DNrCSuYOWoOcKcDAp-0cpSvcREur5ZB5CpfMZxlnfM60s60_ylNEWdTvJRqenUawJw9z1KLO7ogXuujLJx-hMniRifzFX-wQ7lS6T2PTH4ycFZTm8qs8T4MclVwzMITwDJPfBTDVQQ0b-FcLykht4HJSQovcjaA9eiqTdVSsP2YA6kYBv8TDdRmpH_sdvyfNbUWt1GYs7RQ_rtzsaPePVqIjMF0Io5f5N1agleaEnONvR-rHKG4BlrYQMg8WwUaNRmckgDvZbm9EG5044C0OuMgM6-l8F0iU-goynELBQcbNFsTQmw'
      // dispatch(setToken(access_token));

      // // Optionally, set the token globally for axios requests (for all future API calls)
      // axios.defaults.headers['Authorization'] = `Bearer ${access_token}`;
      // router.push("/users");
      console.error('here', error);
      Alert.alert("Login Failed", "Invalid credentials. Please try again.");
    }
  };
  
  useEffect(() => {
    // 
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
        autoCapitalize="none"
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
