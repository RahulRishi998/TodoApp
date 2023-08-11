import {User} from "../models/users.js"
import { sendMail } from "../utils/sendMail.js";
import { sendToken } from "../utils/sendToken.js";
import cloudinary from "cloudinary"
import fs from "fs"

export const register = async (req,res)=>{
    try {
        const {name,email,password} = req.body;

        const avatar = req.files.avatar.tempFilePath;
        console.log(avatar)
            let user = await User.findOne({email})
            if(user){
                return res.status(400).json({success:false,message:"User already exists"})
            } 
            const otp = Math.floor(Math.random()*1000000)

            const myCloud = await cloudinary.v2.uploader.upload(avatar,{
                folder:"todoApp"
            })
            fs.rmSync("./tmp",{recursive:true})

            const otp_expiry = new Date(Date.now() + process.env.OTP_EXPIRE*60*1000)

            user = await User.create({name,email,password,avatar:{public_id:myCloud.public_id,url:myCloud.secure_url},otp,otp_expiry})

            await sendMail(email,"Verify your Account" , `Your OTP is ${otp}`)
            sendToken(res,user,201,"OTP sent to your email, Please verify your account")

    } catch (error) {
        res.status(500).json({success:false,message:error.message})
    }
}


export const login = async (req,res)=> {
    try {
        const {email,password} = req.body;

            if(!email || !password){
                return res.status(400).json({success:true,message:"Please enter all fields"})
            }

            let user = await User.findOne({email}).select("+password")
            if(!user){
                return res.status(400).json({success:false,message:"Invalid Email or Password"})
            } 

            const isMatch = await user.comparePassword(password)

            if(!isMatch){
                return res.status(400).json({success:false,message:"Invalid Email or Password"})
            }

            sendToken(res,user,200,"Login Successfully")

    } catch (error) {
        res.status(500).json({success:false,message:error.message})
    }
}


export const verify = async (req,res)=>{
    try {
        const otp = Number(req.body.otp)
        const user = await User.findById(req.user._id)

        if(user.otp !== otp || user.otp_expiry < Date.now()){
            res.status(400).json({success:false,message:"Invalid OTP or has been Expired"})
        }

        user.verified=true
        user.otp=null
        user.otp_expiry=null

        await user.save()
        sendToken(res,user,200,"Account Verified")

    } catch (error) {
        res.status(500).json({success:false, message:error.message})
    }
}


export const logout = async (req,res)=> {
    try {
        res.status(200).cookie("token",null,{
            expires:new Date(Date.now())
        }).json({success: true, message:"Logged out Successfully"})

    } catch (error) {
        res.status(500).json({success:false,message:error.message})
    }
}


export const addTask = async (req,res)=> {
    try {
        const {title,description} = req.body
        const user = await User.findById(req.user._id);

        user.tasks.push({
            title,description,completed:false,createdAt:new Date(Date.now())
        })

       await user.save()

        res.status(200).json({success:true,message:"Task Added Successfully"})
    } catch (error) {
        res.status(500).json({success:false,message:error.message})
    }
}


export const removeTask = async (req,res)=> {
    try {
        const {taskId} = req.params
        const user = await User.findById(req.user._id);

       user.tasks = user.tasks.filter(task => task._id.toString() !== taskId.toString())

       await user.save()

        res.status(200).json({success:true,message:"Task Deleted Successfully"})
    } catch (error) {
        res.status(500).json({success:false,message:error.message})
    }
}

export const updateTask = async (req,res)=> {
    try {
        const {taskId} = req.params;
        const user = await User.findById(req.user._id);

            user.task = user.tasks.find((task) => task._id.toString() === taskId.toString())
            user.task.completed = !user.task.completed

            await user.save() 
 
        res.status(200).json({success:true,message:"Task Updated Successfully"})
    } catch (error) {
        res.status(500).json({success:false,message:error.message})
    }
}


export const getMyProfile = async (req,res)=> {
    try {
        const user = await User.findById(req.user._id)
        sendToken(res,user,201,`Welocme Back ${user.name} `)
    } catch (error) {
        res.status(500).json({success:false,message:error.message})
    }
}

export const updateMyProfile = async (req,res)=> {
    try {
        const user = await User.findById(req.user._id)
        const {name} = req.body
        const avatar = req.files.avatar.tempFilePath
        if(name) user.name = name

        if(avatar){
            await cloudinary.v2.uploader.destroy(user.avatar.public_id)
            const myCloud =  await cloudinary.v2.uploader.upload(avatar)
            fs.rmSync("./tmp",{recursive:true})

            user.avatar = {
                public_id:myCloud.public_id,
                url:myCloud.secure_url,
            }
        }

        await user.save()

        res.status(200).json({success:true,message:"Profile Updated Successfully"})

    } catch (error) {
        res.status(500).json({success:false,message:error.message})
    }
}

export const updatePassword = async (req,res)=> {
    try {
        const user = await User.findById(req.user._id).select("+password")
        const {oldPassword, newPassword} = req.body

        if(!oldPassword || !newPassword){
            res.status(400).json({success:false,message:"Please Enter All Fields"})
        }

        const isMatch = await user.comparePassword(oldPassword)
        if(!isMatch){
            res.status(400).json({success:false,message:"Invalid Old Password"})
        }
        user.password = newPassword
        await user.save()

        res.status(200).json({success:true,message:"Password Updated Successfully"})

    } catch (error) {
        res.status(500).json({success:false,message:error.message})
    }
}


export const forgetPassword = async (req,res)=> {
    try {
       const {email} = req.body

       const user = await User.findOne({email})
       if(!user){
        return res.status(400).json({success:false,message:"Invalid Email"})
       }
       
       const otp = Math.floor(Math.random()*10000)
       user.resetPasswordOTP = otp
       user.resetPasswordOTPExpire = Date.now() + 10*60*1000

       await user.save()
       await sendMail(email,"Request for Reseting Password", `Your Reset password OTP is ${otp}`)

        res.status(200).json({success:true,message:`OTP sent to ${email}`})

    } catch (error) {
        res.status(500).json({success:false,message:error.message})
    }
}


export const resetPassword = async (req,res)=> {
    try {
       const {otp,newPassword} = req.body

       const user = await User.findOne({resetPasswordOTP:otp,resetPasswordOTPExpire:{$gt:Date.now()}}).select("+password")
       if(!user){
        return res.status(400).json({success:false,message:"OTP Invalid or has been expired"})
       }
       
       user.password = newPassword
       user.resetPasswordOTP = null
       user.resetPasswordOTPExpire = null

       await user.save()

        res.status(200).json({success:true,message:`Password changed successfully`})

    } catch (error) {
        res.status(500).json({success:false,message:error.message})
    }
}