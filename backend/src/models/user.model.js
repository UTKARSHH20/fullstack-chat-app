import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
        minLength: 6
    },
    profilePicture: {
        type: String,
        required: false,
        default: ""
    },
    pushSubscription: {
        type: Object,
        default: null
    }
});

const User = mongoose.model("User", userSchema);
export default User;