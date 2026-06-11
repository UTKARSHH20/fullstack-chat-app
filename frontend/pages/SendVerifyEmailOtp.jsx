import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import React from 'react'
import toast from "react-hot-toast"

function SendVerifyEmailOtp() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const res = await axios.post(
        "http://localhost:5001/api/auth/send-verification-email-otp",
        { email }
      );

      toast.success(res.data.message);

      localStorage.setItem("verifyEmail", email);

      navigate("/verify-email");
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to send OTP"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-base-100 shadow-xl p-8 rounded-xl w-full max-w-md">

        <h1 className="text-3xl font-bold text-center mb-6">
          Verify Your Email
        </h1>

        <form onSubmit={handleSendOtp}>
          <input
            type="email"
            placeholder="Enter your email"
            className="input input-bordered w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full mt-4"
          >
            {loading ? "Sending..." : "Send OTP"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default SendVerifyEmailOtp
