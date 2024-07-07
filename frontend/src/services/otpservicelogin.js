import axios from 'axios';

let API_URL = 'http://localhost:3001/api';

const axiosInstance = axios.create({
  withCredentials: true  // This allows sending cookies cross-origin
});

const sendOtp = (email,title) => {
  return axiosInstance.post(`${API_URL+title}/send-otp`, { email });
};

const verifyOtp = (email, otp,title) => {
  return axiosInstance.post(`${API_URL+title}/verify-otp`, { email, otp });
};

export default { sendOtp, verifyOtp };