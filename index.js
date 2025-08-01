const mongoose = require("mongoose");
mongoose.connect("mongodb://localhost:27017/user_management_system");


const express = require("express");
const app = express();
const path = require('path');

//for user routes
const userRoute = require("./routes/userRoute");
app.use('/',userRoute);

app.listen(3000,function(){
    console.log("Server started at port 3000");
});