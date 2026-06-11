import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast"

const VerifyEmail = () => {
  const navigate = useNavigate();

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    if (otp.length !== 6) {
      return toast.error("Please enter a valid 6-digit OTP");
    }

    try {
      setLoading(true);

      const res = await axios.post(
  "http://localhost:5001/api/auth/Verified-account",
  { otp },
  { withCredentials: true }
);

      toast.success(res.data.message);

      navigate("/");
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "OTP verification failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      const res = await axios.post(
  "http://localhost:5001/api/auth/send-verification-email-otp",
  {},
  { withCredentials: true }
);

      toast.success(res.data.message);
    } catch (error) {
      toast.error(
         error.response?.data?.message ||
          "Failed to resend OTP"
      )
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="bg-base-100 shadow-xl rounded-xl p-8 w-full max-w-md">

        <h1 className="text-3xl font-bold text-center mb-2">
          Verify Email
        </h1>

        <p className="text-center text-gray-500 mb-6">
          Enter the OTP sent to
        </p>

        <form onSubmit={handleVerifyOtp}>
          <input
            type="text"
            value={otp}
            onChange={(e) =>
              setOtp(
                e.target.value
                  .replace(/\D/g, "")
                  .slice(0, 6)
              )
            }
            placeholder="Enter 6-digit OTP"
            className="input input-bordered w-full text-center text-xl tracking-[10px]"
            maxLength={6}
          />

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full mt-5"
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </form>

        <button
          onClick={handleResendOtp}
          className="btn btn-outline w-full mt-3"
        >
          Resend OTP
        </button>
      </div>
    </div>
  );
};

export default VerifyEmail;