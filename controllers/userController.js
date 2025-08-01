const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");

const securePassword = async(password)=>{
    try {
        const passwordHash = await bcrypt.hash(password,10);
        return passwordHash;
    } catch (error) {
        console.error("Error securing password:", error.message);
        throw new Error("Failed to secure password."); 
    }
}


const sendVerifyMail = async(name, email, id, host = "http://127.0.0.1:3000")=>{
    try {
        const transporter = nodemailer.createTransport({
            host:"smtp.gmail.com",
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:"@gmail.com", //  email address
                pass:"**** **** **** ****" // yesma App Password
            }
        });
        const mailOptions = {
            from:"@gmail.com",
            to:email,
            subject:"For Mail Verification",
            
            html:'<p>Hi '+name+', please click here to <a href="'+host+'/verify?id='+id+'">Verify</a> your mail.</p>'
        }
        transporter.sendMail(mailOptions, function(error,info){
            if(error){
                console.error("Error sending verification email:", error);
            } else {
                console.log("Verification email has been sent:",info.response);
            }
        })
    } catch (error) {
        console.error("Error in sendVerifyMail function:", error.message);
    }
}


const loadRegister = async(req,res)=>{
    try {
        res.render("registration");
    } catch (error) {
        console.error("Error loading registration page:", error.message);
        res.status(500).send("Internal Server Error");
    }
}

const insertUser = async(req,res)=>{
    try {
        const sPassword = await securePassword(req.body.password);
        const user = new User({
            name:req.body.name,
            email:req.body.email,
            mobile:req.body.mobile,
            password:sPassword,
            image:req.file ? req.file.filename : null, 
            is_admin:0,
            is_verified:0
        })
        const userData = await user.save();

        if(userData){
            
            const currentHost = req.protocol + '://' + req.get('host');
            sendVerifyMail(req.body.name, req.body.email, userData._id, currentHost);
            res.render('registration',{message:"User Registered Successfully. Please verify your mail."});
        }else{
            res.render('registration',{message:"User Registration Failed"});
        }
    }catch (error) {
        console.error("Error inserting user:", error.message);
        res.render('registration',{message:"User Registration Failed: " + error.message});
    }
}


const verifyMail = async(req,res)=>{
    try {
        
        if (!req.query.id || !mongoose.Types.ObjectId.isValid(req.query.id)) {
            console.warn("Invalid or missing ID for email verification:", req.query.id);
            return res.render("email-verified", { message: "Invalid verification link." });
        }

        const updatedInfo = await User.updateOne({_id:req.query.id},{$set:{is_verified:1}});
        if (updatedInfo.modifiedCount > 0) {
            console.log("User verified successfully:", req.query.id);
            res.render("email-verified");
        } else {
            console.warn("User not found or already verified:", req.query.id);
            res.render("email-verified", { message: "Verification failed or already verified." });
        }
    } catch (error) {
        console.error("Error verifying mail:", error.message);
        res.status(500).send("Error verifying email.");
    }
}


const loginLoad = async (req, res) => {
    try {
        return res.render("login");
    } catch (error) {
        console.error("Error loading login page:", error.message);
        res.status(500).send("Internal Server Error");
    }
};


const verifyLogin = async(req,res)=>{
    try {
        const email = req.body.email;
        const password = req.body.password;
        const userData = await User.findOne({email:email});

        if(userData){
            const passwordMatch = await bcrypt.compare(password,userData.password);
            if(passwordMatch){
                if(userData.is_verified == 0){
                     res.render("login",{message:"Please verify your mail."});
                }else{
                   req.session.user_id = userData._id;
                   res.redirect("/home");
                }
            } else {
               res.render("login",{message:"Email or Password is incorrect."});
            }
        } else {
            res.render("login",{message: "Email or Password is incorrect."});
        }
    } catch (error) {
        console.error("Error during login verification:", error.message);
        res.status(500).send("Internal Server Error");
    }
};

//homepage load

const loadHome = async(req,res)=>{
    try {
        
        if (!req.session.user_id || !mongoose.Types.ObjectId.isValid(req.session.user_id)) {
            console.warn("User session ID missing or invalid, redirecting to login.");
            req.session.destroy(); 
            return res.redirect("/login");
        }

        const userData=await User.findById({_id:req.session.user_id});
        if (userData) {
            res.render("home",{user:userData});
        } else {
            
            req.session.destroy();
            res.redirect("/login");
        }
    } catch (error) {
        console.error("Error loading home page:", error.message);
        res.status(500).send("Internal Server Error");
    }
}


const userLogout = async(req,res)=>{
    try {
        req.session.destroy(); 
        res.redirect("/"); 
    } catch (error) {
        console.error("Error during user logout:", error.message);
        res.status(500).send("Internal Server Error");
    }
}

module.exports = {
    loadRegister,
    insertUser,
    verifyMail,
    loginLoad,
    verifyLogin,
    loadHome,
    userLogout
}
