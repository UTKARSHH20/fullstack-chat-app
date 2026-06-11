import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

function SendVerifyEmailOtp() {
const [loading, setLoading] = useState(false);
const navigate = useNavigate();

const handleSendOtp = async () => {
try {
setLoading(true);
  const res = await axios.post(
    "http://localhost:5001/api/auth/send-verification-email-otp",
    {},
    { withCredentials: true }
  );

  toast.success(res.data.message);

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

return ( <div className="min-h-screen flex items-center justify-center"> <div className="bg-base-100 shadow-xl p-8 rounded-xl w-full max-w-md"> <h1 className="text-3xl font-bold text-center mb-6">
Verify Your Email </h1>
    <button
      onClick={handleSendOtp}
      disabled={loading}
      className="btn btn-primary w-full"
    >
      {loading ? "Sending..." : "Send OTP"}
    </button>
  </div>
</div>
);
}

export default SendVerifyEmailOtp;
