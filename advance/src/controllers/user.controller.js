import asyncHandler from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async(userId) => {
    try {
        const user = await User.findOne(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken =user.generateRefreshToken()

        user.refreshToken=refreshToken
        await user.save({validateBeforeSave:false})

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "something went wrong while generating refresh or access token")
    }
}




const registerUser = asyncHandler(async (req, res) =>{
    //get user details from frontend
    //validation - not empty fields
    // check if user already exist: username, email
    //check for images, check for avatar
    // upload them to cloudinary, avatat
    //create user object - create entry in db
    //remove password and refresh token field from response
    // check for user creation
    //return res
    const {fullName, email, username,password}=req.body
    // if (fullName==="") {
    //     throw new  ApiError(400, "fullname is required")
    // }

    if (
        [fullName, email, username, password].some((field)=>
        field?.trim()==="")
    ) {
        throw new ApiError(400,"All fields are required")
    }

    const existedUser = await User.findOne({
        $or:[{ username },{ email }]
    })
    if (existedUser) {
        throw new ApiError(409, "user is already registered with this mail or username")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverLocalPath = req.files?.coverImage[0]?.path;

    let coverLocalPath ;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverLocalPath = req.files.coverImage[0].path;
        
    }



    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    
   const avatar = await uploadOnCloudinary(avatarLocalPath)
   const coverImage = await uploadOnCloudinary(coverLocalPath)

   if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
   }

    const user = await User.create({
    fullName,
    avatar:avatar.url,
    coverImage:coverImage?.url || "",
    email,
    password,
    username:username.toLowerCase()
   })

   const createdUser = await User.findById(user._id).select(
    "-password -refereshToken"
   )

   if(!createdUser){
    throw new ApiError(500,"somethis went wrong while registering the user")
   }


   return res.status(201).json(
    new ApiResponse(200, createdUser, "User registered Successfully")
   )

})


const loginUser = asyncHandler(async (req, res)=>{
    //req.body -> data
    //username or email
    //find user
    //password check
    //access and refresh token generation
    //send cookie
    //response send

    const {email, username, password} = req.body

    if (!(username || email)) {
        throw new ApiError(400, "username or email is required");

    }

    const user = await User.findOne({
        $or:[{username},{email}]
    });

    if (!user) {
        throw new ApiError(404, 'User does not exist');
        
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(404, "Password is incorrect");        
    }

    const {accessToken, refreshToken} =await generateAccessAndRefreshToken(user._id)
    // console.log(accessToken)
    // console.log(refreshToken)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )
})

const logoutUser = asyncHandler(async (req, res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        }
    )

    const options = {
        httpOnly:true,
        secure:true
    }

    return res
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(
            200,
            {
            },
            "User logged Out Successfully"
        )
    )
})


const refreshAccessToken = asyncHandler(async (req, res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if (!incomingRefreshToken) {
        throw new ApiError(401, "unautorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401, "Invalid Access Token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
    
        }
        const options ={
            httpOnly: true,
            secure:true
        }
    
        const { accessToken, newrefreshToken} = await generateAccessAndRefreshToken(user._id)
        
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newrefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken, refreshToken:newrefreshToken
                },
                "Access token Refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})




export {registerUser, loginUser, logoutUser, refreshAccessToken}