import express from "express"
import { register,verify,login,logout, addTask, removeTask, updateTask, getMyProfile, updateMyProfile, updatePassword, forgetPassword, resetPassword } from "../controllers/user.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router()

router.route("/register").post(register)
router.route("/login").post(login)
router.route("/logout").get(logout)
router.route("/verify").post(isAuthenticated,verify)

router.route("/newtask").post(isAuthenticated,addTask);
router.route("/task/:taskId").get(isAuthenticated,updateTask)

router.route("/task/:taskId").delete(isAuthenticated,removeTask)
router.route("/me").post(isAuthenticated,getMyProfile)

router.route("/updateprofile").put(isAuthenticated,updateMyProfile)
router.route("/updatepassword").put(isAuthenticated,updatePassword)

router.route("/forgetpassword").post(forgetPassword)
router.route("/resetpassword").put(resetPassword)


export default router;